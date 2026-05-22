import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreatePropertyDto {
  @IsString()
  title!: string;

  @IsString()
  @IsOptional()
  description!: string;

  @IsNumber()
  price!: number;

  @IsString()
  address!: string;

  @IsString()
  city!: string;

  @IsString()
  ownerId!: string;

  @IsBoolean()
  @IsOptional()
  isAvailable!: boolean;
}
