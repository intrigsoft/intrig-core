export type DescriptorType = 'rest' | 'schema'

export interface IResourceDescriptor<T> {
  id: string;
  name: string,
  type: DescriptorType;
  source: string;
  path: string;
  data: T
}

export class ResourceDescriptor<T> implements IResourceDescriptor<T> {
  id: string;
  name: string;
  type: DescriptorType;
  source: string;
  path: string;
  data: T;
  lastAccessed?: number;

  constructor(id: string, name: string, type: DescriptorType, source: string, path: string, data: T, lastAccessed?: number) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.source = source;
    this.path = path;
    this.data = data;
    this.lastAccessed = lastAccessed;
  }

  public static from<T>(descriptor: IResourceDescriptor<T>) {
    return new ResourceDescriptor(descriptor.id, descriptor.name, descriptor.type, descriptor.source, descriptor.path, descriptor.data);
  }
}