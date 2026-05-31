import { IsDateString, IsUUID } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  propertyId!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;
}
