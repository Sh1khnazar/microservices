import { Controller } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersService } from './users.service';

@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @MessagePattern('user.create')
  create(@Payload() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @MessagePattern('user.findAll')
  findAll() {
    return this.usersService.findAll();
  }

  @MessagePattern('user.findOne')
  findOne(@Payload() data: { id: string }) {
    return this.usersService.findOne(data.id);
  }

  @MessagePattern('user.update')
  update(@Payload() data: { id: string; body: UpdateUserDto }) {
    return this.usersService.update(data.id, data.body);
  }

  @MessagePattern('user.remove')
  remove(@Payload() data: { id: string }) {
    return this.usersService.remove(data.id);
  }
}
