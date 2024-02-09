import { Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { CreateOptionDto } from './dto';

@Injectable()
export class OptionService {
    constructor(private prismaService: PrismaService) {}

    async create(dto: CreateOptionDto, product_id: string) {
        if (!dto?.title || !dto?.description) return;
        const option = await this.prismaService.option.create({
            data: {
                productId: product_id,
                title: dto?.title ? dto.title.trim() : undefined,
                description: dto?.description ? dto.description.trim() : undefined,
            },
        });
        return option;
    }

    async update(dto: any, id: string) {
        if (!dto.id) {
            const option = await this.prismaService.option.create({
                data: {
                    productId: id,
                    title: dto?.title ? dto.title.trim() : undefined,
                    description: dto?.description ? dto.description.trim() : undefined,
                },
            });
            return option;
        } else {
            const option = await this.prismaService.option.update({
                where: { id: dto.id },
                data: {
                    title: dto?.title ? dto.title.trim() : undefined,
                    description: dto?.description ? dto.description.trim() : undefined,
                },
            });
            return option;
        }
    }

    async getList(filter) {
        const options = await this.prismaService.option.findMany({ where: { productId: filter.product_id } });
        return options;
    }

    async getOne(id: number) {
        const option = await this.prismaService.option.findUnique({ where: { id } });
        return option;
    }

    async getMany(ids: number[]) {
        const options = await this.prismaService.option.findMany({ where: { id: { in: [...ids] } } });
        return options;
    }

    async delete(id: number) {
        const del = await this.prismaService.option.delete({ where: { id } });
        return del;
    }
    async deleteMany(ids: number[]) {
        await this.prismaService.option.deleteMany({ where: { id: { in: [...ids] } } });
        return ids;
    }
}
