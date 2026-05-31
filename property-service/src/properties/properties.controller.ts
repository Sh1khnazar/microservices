import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertiesService } from './properties.service';

@Controller()
export class PropertiesController {
  constructor(private readonly propertiesService: PropertiesService) {}

  @MessagePattern('property.create')
  create(@Payload() dto: CreatePropertyDto) {
    return this.propertiesService.create(dto);
  }

  @MessagePattern('property.findAll')
  findAll() {
    return this.propertiesService.findAll();
  }

  @MessagePattern('property.findOne')
  findOne(@Payload() data: { id: string }) {
    return this.propertiesService.findOne(data.id);
  }

  @MessagePattern('property.update')
  update(
    @Payload()
    data: {
      id: string;
      body: UpdatePropertyDto;
      requesterId: string;
    },
  ) {
    return this.propertiesService.update(data.id, data.body, data.requesterId);
  }

  @MessagePattern('property.remove')
  remove(@Payload() data: { id: string; requesterId: string }) {
    return this.propertiesService.remove(data.id, data.requesterId);
  }

  @MessagePattern('property.setAvailability')
  setAvailability(@Payload() data: { id: string; isAvailable: boolean }) {
    return this.propertiesService.setAvailability(data.id, data.isAvailable);
  }
}
