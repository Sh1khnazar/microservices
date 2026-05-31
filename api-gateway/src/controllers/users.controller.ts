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
import { CreateUserDto } from '../dto/create-user.dto';

@Controller('users')
export class UsersController {
  constructor(
    @Inject('USER_SERVICE')
    private readonly userClient: ClientProxy,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() body: CreateUserDto) {
    return this.userClient.send('user.create', body);
  }

  @Get()
  findAll() {
    return this.userClient.send('user.findAll', {});
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userClient.send('user.findOne', { id });
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() body: Partial<CreateUserDto>) {
    return this.userClient.send('user.update', { id, body });
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    return this.userClient.send('user.remove', { id });
  }
}
