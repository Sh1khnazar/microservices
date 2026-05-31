import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { Property } from './entities/property.entity';

@Injectable()
export class PropertiesService {
  constructor(
    @InjectRepository(Property)
    private readonly propertyRepo: Repository<Property>,
  ) {}

  create(dto: CreatePropertyDto): Promise<Property> {
    const property = this.propertyRepo.create(dto);
    return this.propertyRepo.save(property);
  }

  findAll(): Promise<Property[]> {
    return this.propertyRepo.find();
  }

  async findOne(id: string): Promise<Property> {
    const property = await this.propertyRepo.findOneBy({ id });
    if (!property) throw new NotFoundException(`Property #${id} topilmadi`);
    return property;
  }

  async update(
    id: string,
    dto: UpdatePropertyDto,
    requesterId: string,
  ): Promise<Property> {
    const property = await this.findOne(id);
    if (property.ownerId !== requesterId) {
      throw new ForbiddenException('Faqat egasi o\'zgartirishi mumkin');
    }
    await this.propertyRepo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string, requesterId: string): Promise<{ deleted: boolean }> {
    const property = await this.findOne(id);
    if (property.ownerId !== requesterId) {
      throw new ForbiddenException('Faqat egasi o\'chira oladi');
    }
    await this.propertyRepo.delete(id);
    return { deleted: true };
  }

  async setAvailability(id: string, isAvailable: boolean): Promise<Property> {
    await this.findOne(id);
    await this.propertyRepo.update(id, { isAvailable });
    return this.findOne(id);
  }
}
