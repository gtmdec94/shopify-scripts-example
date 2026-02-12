import { IsString, IsNumber, IsOptional, IsArray, IsBoolean, ValidateNested, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class CreateVariantDto {
  @ApiProperty()
  @IsString()
  sku: string;

  @ApiProperty()
  @IsString()
  title: string;

  @ApiProperty()
  @IsOptional()
  options?: Record<string, string>;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number;

  @ApiProperty()
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  inventoryQty?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'MUG-WHITE-11OZ' })
  @IsString()
  manufacturerSku: string;

  @ApiProperty({ example: 'Custom White Ceramic Mug' })
  @IsString()
  title: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 299.0 })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({ example: 120.0 })
  @IsNumber()
  @Min(0)
  costPrice: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsArray()
  images?: string[];

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  printConfigId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  customizationSchema?: Record<string, any>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiProperty({ required: false, type: [CreateVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateVariantDto)
  variants?: CreateVariantDto[];
}
