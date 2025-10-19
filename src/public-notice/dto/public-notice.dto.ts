import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PublicNoticeListItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  type!: string | null;

  @ApiProperty()
  isFixed!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  attachments!: number;
}

export class PublicNoticeListResponseDto {
  @ApiProperty({ type: () => [PublicNoticeListItemDto] })
  items!: PublicNoticeListItemDto[];
}

export class PublicNoticeDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  title!: string;

  @ApiPropertyOptional({ nullable: true })
  type!: string | null;

  @ApiProperty()
  isFixed!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  content!: string;

  @ApiProperty({ type: [String] })
  attachmentFiles!: string[];
}
