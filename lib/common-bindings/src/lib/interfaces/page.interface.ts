import {ApiProperty} from '@nestjs/swagger';

export interface IPage<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export class Page<T> implements IPage<T> {
  // @ApiProperty({description: 'Array of items on the current page', isArray: true})
  data: T[];

  @ApiProperty({description: 'Total number of items across all pages'})
  total: number;

  @ApiProperty({description: 'Current page number (1-based)'})
  page: number;

  @ApiProperty({description: 'Maximum number of items per page'})
  limit: number;

  @ApiProperty({description: 'Total number of pages'})
  totalPages: number;

  @ApiProperty({description: 'Whether there is a next page available'})
  hasNext: boolean;

  @ApiProperty({description: 'Whether there is a previous page available'})
  hasPrevious: boolean;

  constructor(data: T[], total: number, page: number, limit: number, totalPages: number, hasNext: boolean, hasPrevious: boolean) {
    this.data = data;
    this.total = total;
    this.page = page;
    this.limit = limit;
    this.totalPages = totalPages;
    this.hasNext = hasNext;
    this.hasPrevious = hasPrevious;
  }

  public static from<T>(page: IPage<T>): Page<T> {
    return new Page(page.data, page.total, page.page, page.limit, page.totalPages, page.hasNext, page.hasPrevious);
  }
}

