import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';
import { ensureDirSync } from 'fs-extra';
// import { Low } from 'lowdb';
// import { JSONFile } from 'lowdb/node';
import { EntityView } from '../models/entity-view.model';

// Define the database structure
interface LastVisitDB {
  items: EntityView[];
  pinnedItems: EntityView[];
}

export interface Adapter<T> {
  read: () => Promise<T | null>;
  write: (data: T) => Promise<void>;
}

export interface Low<T = unknown> {
  adapter: Adapter<T>;
  data: T;
  read(): Promise<void>;
  write(): Promise<void>;
  update(fn: (data: T) => unknown): Promise<void>;
}

@Injectable()
export class LastVisitService {
  private readonly logger = new Logger(LastVisitService.name);
  private db: Low<LastVisitDB>;
  private readonly configDir: string;
  private readonly dbFile: string;
  private readonly MAX_ITEMS = 50; // Maximum number of items to keep in history

  constructor(private configService: ConfigService) {
    const rootDir = this.configService.get('rootDir')!;
    this.configDir = join(rootDir, '.intrig', '.config');
    this.dbFile = join(this.configDir, 'last-visit.json');
    
    // Ensure the config directory exists
    ensureDirSync(this.configDir);
    
    // Load the database
    this.loadDb().catch(e => console.error('Failed to load last visit database', e));
  }

  private async loadDb(): Promise<void> {
    const { JSONFile } = await import(/* webpackIgnore: true */ 'lowdb/node');
    const adapter = new JSONFile<LastVisitDB>(this.dbFile);
    const { Low } = await import(/* webpackIgnore: true */ 'lowdb');
    this.db = new Low<LastVisitDB>(adapter, { items: [], pinnedItems: [] });
    try {

      await this.db.read();
      // Initialize if data is null
      this.db.data = this.db.data || { items: [], pinnedItems: [] };
      // Ensure pinnedItems exists (for backward compatibility)
      if (!this.db.data.pinnedItems) {
        this.db.data.pinnedItems = [];
      }
      this.logger.debug(`Loaded last visit database with ${this.db.data.items.length} items and ${this.db.data.pinnedItems.length} pinned items`);
    } catch (error) {
      this.logger.error('Failed to load last visit database', error);
      // Initialize with empty data if there's an error
      this.db.data = { items: [], pinnedItems: [] };
    }
  }

  private async saveDb(): Promise<void> {
    try {
      await this.db.write();
      this.logger.debug('Last visit database saved successfully');
    } catch (error) {
      this.logger.error('Failed to save last visit database', error);
    }
  }

  /**
   * Track a schema view
   * @param id Schema ID
   * @param name Schema name
   * @param source Schema source
   */
  async trackSchemaView(id: string, name: string, source: string): Promise<void> {
    await this.trackItem(new EntityView({
      id,
      name,
      source,
      type: 'schema'
    }));
  }

  /**
   * Track an endpoint view
   * @param id Endpoint ID
   * @param name Endpoint name
   * @param source Endpoint source
   */
  async trackEndpointView(id: string, name: string, source: string): Promise<void> {
    await this.trackItem(new EntityView({
      id,
      name,
      source,
      type: 'endpoint'
    }));
  }

  /**
   * Track an item view
   * @param item The item to track
   * @private
   */
  private async trackItem(item: EntityView): Promise<void> {
    // Ensure the database is loaded
    if (!this.db.data) {
      await this.loadDb();
    }

    // Remove the item if it already exists (to avoid duplicates)
    this.db.data.items = this.db.data.items.filter(i => !(i.id === item.id && i.type === item.type));
    
    // Add the new item at the beginning of the array
    this.db.data.items.unshift(item);
    
    // Limit the number of items
    if (this.db.data.items.length > this.MAX_ITEMS) {
      this.db.data.items = this.db.data.items.slice(0, this.MAX_ITEMS);
    }
    
    // Save the database
    await this.saveDb();
    this.logger.debug(`Tracked ${item.type} view: ${item.name} (${item.id})`);
  }

  /**
   * Get all tracked items
   */
  async getItems(): Promise<EntityView[]> {
    // Ensure the database is loaded
    if (!this.db.data) {
      await this.loadDb();
    }
    return this.db.data.items;
  }

  /**
   * Get tracked items by type
   * @param type The type of items to get
   */
  async getItemsByType(type: 'schema' | 'endpoint'): Promise<EntityView[]> {
    // Ensure the database is loaded
    if (!this.db.data) {
      await this.loadDb();
    }
    return this.db.data.items.filter(item => item.type === type);
  }

  /**
   * Get the last n visited items
   * @param limit Number of items to return (default: 10)
   * @param type Optional filter by item type
   */
  async getLastNItems(limit = 10, type?: 'schema' | 'endpoint'): Promise<EntityView[]> {
    // Ensure the database is loaded
    if (!this.db.data) {
      await this.loadDb();
    }
    
    // Filter by type if specified
    const items = type 
      ? this.db.data.items.filter(item => item.type === type)
      : this.db.data.items;
    
    // Return the first n items (they're already sorted by most recent first)
    return items.slice(0, limit);
  }

  /**
   * Toggle pin status of an item
   * @param id Item ID
   * @param type Item type ('schema' or 'endpoint')
   * @param source Item source (optional if item exists in last visit)
   * @param name Item name (optional if item exists in last visit)
   * @returns Object containing success status and the new pin state (true if pinned, false if unpinned)
   */
  async togglePinItem(id: string, type: 'schema' | 'endpoint', source?: string, name?: string): Promise<{ success: boolean, pinned: boolean }> {
    // Ensure the database is loaded
    if (!this.db.data) {
      await this.loadDb();
    }

    // Check if the item is already pinned
    const alreadyPinned = this.db.data.pinnedItems.some(i => i.id === id && i.type === type);
    
    if (alreadyPinned) {
      // Item is already pinned, so unpin it
      const pinnedItemIndex = this.db.data.pinnedItems.findIndex(i => i.id === id && i.type === type);
      if (pinnedItemIndex === -1) {
        // This shouldn't happen since we already checked alreadyPinned
        this.logger.warn(`Inconsistent state: Item marked as pinned but not found in pinnedItems: ${id} (${type})`);
        return { success: false, pinned: false };
      }

      // Get the pinned item before removing it (for logging)
      const pinnedItem = this.db.data.pinnedItems[pinnedItemIndex];
      
      // Remove the item from pinnedItems
      this.db.data.pinnedItems.splice(pinnedItemIndex, 1);

      // Also update the item in the items array if it exists
      const itemIndex = this.db.data.items.findIndex(i => i.id === id && i.type === type);
      if (itemIndex !== -1) {
        this.db.data.items[itemIndex].pinned = false;
      }

      // Save the database
      await this.saveDb();
      this.logger.debug(`Unpinned ${type}: ${pinnedItem.name} (${id})`);
      return { success: true, pinned: false };
    } else {
      // Item is not pinned, so pin it
      // Find the item in the items array
      let item = this.db.data.items.find(i => i.id === id && i.type === type);
      
      // If item doesn't exist in last visit but we have source and name, we can still pin it
      if (!item) {
        if (!source) {
          this.logger.warn(`Item not found for pinning and source not provided: ${id} (${type})`);
          return { success: false, pinned: false };
        }
        
        // Create a new item with the provided information
        item = new EntityView({
          id,
          type,
          source,
          name: name || id, // Use id as name if name not provided
        });
        
        this.logger.debug(`Creating new pin for item not in last visit: ${id} (${type})`);
      }

      // Add the item to pinnedItems
      const pinnedItem = new EntityView({
        id: item.id,
        name: item.name,
        source: item.source,
        type: item.type,
        pinned: true,
        accessTime: new Date().toISOString()
      });
      this.db.data.pinnedItems.push(pinnedItem);

      // Also update the item in the items array if it exists
      const itemIndex = this.db.data.items.findIndex(i => i.id === id && i.type === type);
      if (itemIndex !== -1) {
        this.db.data.items[itemIndex].pinned = true;
      }

      // Save the database
      await this.saveDb();
      this.logger.debug(`Pinned ${type}: ${pinnedItem.name} (${id})`);
      return { success: true, pinned: true };
    }
  }

  /**
   * Pin an item (deprecated, use togglePinItem instead)
   * @param id Item ID
   * @param type Item type ('schema' or 'endpoint')
   * @param source Item source (optional if item exists in last visit)
   * @param name Item name (optional if item exists in last visit)
   * @deprecated Use togglePinItem instead
   */
  async pinItem(id: string, type: 'schema' | 'endpoint', source?: string, name?: string): Promise<boolean> {
    const result = await this.togglePinItem(id, type, source, name);
    return result.success && result.pinned;
  }

  /**
   * Unpin an item (deprecated, use togglePinItem instead)
   * @param id Item ID
   * @param type Item type ('schema' or 'endpoint')
   * @deprecated Use togglePinItem instead
   */
  async unpinItem(id: string, type: 'schema' | 'endpoint'): Promise<boolean> {
    // If the item is not pinned, this will return success: true, pinned: false
    // If the item is pinned, it will be unpinned and return success: true, pinned: false
    const result = await this.togglePinItem(id, type);
    return result.success;
  }

  /**
   * Get all pinned items
   * @param type Optional filter by item type
   */
  async getPinnedItems(type?: 'schema' | 'endpoint'): Promise<EntityView[]> {
    // Ensure the database is loaded
    if (!this.db.data) {
      await this.loadDb();
    }
    
    // Filter by type if specified
    return type 
      ? this.db.data.pinnedItems.filter(item => item.type === type)
      : this.db.data.pinnedItems;
  }
}