import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly jwtService: JwtService,
  ) {}

  async create(dto: CreateUserDto): Promise<Omit<User, 'password'>> {
    const exists = await this.userRepo.findOneBy({ email: dto.email });
    if (exists) throw new ConflictException('Bu email allaqachon ro\'yxatdan o\'tgan');

    const hashed = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, password: hashed });
    const saved = await this.userRepo.save(user);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = saved;
    return result;
  }

  findAll(): Promise<User[]> {
    return this.userRepo.find();
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo.findOneBy({ id });
    if (!user) throw new NotFoundException(`User #${id} topilmadi`);
    return user;
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    await this.findOne(id);
    if (dto.password) {
      dto.password = await bcrypt.hash(dto.password, 12);
    }
    await this.userRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<{ deleted: boolean }> {
    await this.findOne(id);
    await this.userRepo.delete(id);
    return { deleted: true };
  }

  async login(email: string, password: string): Promise<{ access_token: string }> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.password')
      .where('u.email = :email', { email })
      .getOne();

    if (!user) throw new UnauthorizedException('Email yoki parol noto\'g\'ri');

    const match = await bcrypt.compare(password, user.password);
    if (!match) throw new UnauthorizedException('Email yoki parol noto\'g\'ri');

    const payload = { sub: user.id, email: user.email };
    return { access_token: this.jwtService.sign(payload) };
  }
}
