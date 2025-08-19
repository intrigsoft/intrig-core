import { ApiProperty } from '@nestjs/swagger';

export class FileListResponseDto {
  @ApiProperty({
    description: 'List of files where the endpoint/datatype is used',
    type: [String],
    example: ['src/app/components/user-profile.tsx', 'src/app/services/user-service.ts']
  })
  files: string[];

  constructor(files: string[]) {
    this.files = files;
  }
}