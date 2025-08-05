// Define the class for our tracked items
export class LastVisitItem {
  id: string;
  name: string;
  source: string;
  accessTime: string;
  type: 'schema' | 'endpoint';
  pinned?: boolean;
  
  constructor(data: {
    id: string;
    name: string;
    source: string;
    accessTime?: string;
    type: 'schema' | 'endpoint';
    pinned?: boolean;
  }) {
    this.id = data.id;
    this.name = data.name;
    this.source = data.source;
    this.accessTime = data.accessTime || new Date().toISOString();
    this.type = data.type;
    this.pinned = data.pinned || false;
  }
}