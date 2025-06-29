import {ApiProperty} from "@nestjs/swagger";

export class Tab {
  @ApiProperty({description: 'Name of the tab'})
  name: string;

  @ApiProperty({description: 'Content of the tab'})
  content: string;

  constructor(name: string, content: string) {
    this.name = name;
    this.content = content;
  }

  static from(tab: Tab) {
    return new Tab(tab.name, tab.content);
  }
}

export class RelatedType {
  @ApiProperty({description: 'Name of the related type'})
  name: string;

  @ApiProperty({description: 'Identifier of the related type'})
  id: string;

  constructor(name: string, id: string) {
    this.name = name;
    this.id = id;
  }

  static from(type: RelatedType) {
    return new RelatedType(type.name, type.id);
  }
}