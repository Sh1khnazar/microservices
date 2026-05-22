import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Param,
  Post,
  Put,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';

@Controller('properties')
export class PropertiesController {
  constructor(
    @Inject('PROPERTY_SERVICE')
    private readonly propertyClient: ClientProxy,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: any) {
    return this.propertyClient.send('property.create', body);
  }

  @Get()
  findAll() {
    return this.propertyClient.send('property.findAll', {});
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.propertyClient.send('property.findOne', { id });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.propertyClient.send('property.update', { id, body });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.propertyClient.send('property.remove', { id });
  }
}
