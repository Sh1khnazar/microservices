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
  UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-auth.guard';
import { CreatePropertyDto } from '../dto/create-property.dto';
import { UpdatePropertyDto } from '../dto/update-property.dto';

@Controller('properties')
export class PropertiesController {
  constructor(
    @Inject('PROPERTY_SERVICE')
    private readonly propertyClient: ClientProxy,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard)
  create(@Body() body: CreatePropertyDto, @CurrentUser() user: JwtPayload) {
    return this.propertyClient.send('property.create', {
      ...body,
      ownerId: user.sub,
    });
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
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() body: UpdatePropertyDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.propertyClient.send('property.update', {
      id,
      body,
      requesterId: user.sub,
    });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.propertyClient.send('property.remove', {
      id,
      requesterId: user.sub,
    });
  }
}
