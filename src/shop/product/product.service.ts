import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '@prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { FilesService } from 'src/files/files.service';
import { TypeService } from '../type/type.service';
import { BrandService } from '../brand/brand.service';
import { OptionService } from '../option/option.service';
import { FILTERS } from 'src/shop/product/utils/filters';
import { FiltersInterface } from './utils/types';

@Injectable()
export class ProductService {
    constructor(
        private prismaService: PrismaService,
        private typeService: TypeService,
        private brandService: BrandService,
        private optionService: OptionService,
        private filesService: FilesService,
    ) {}

    async create(dto: CreateProductDto, files: Array<Express.Multer.File>, logo: Express.Multer.File) {
        const brand = await this.brandService.getOne(Number(dto.brandId));
        if (!brand) throw new BadRequestException('Бренда с таким id не существует');
        const type = await this.typeService.getOne(Number(dto.typeId));
        if (!type) throw new BadRequestException('Типа с таким id не существует');
        let logoName = '';
        if (logo) {
            const name = await this.filesService.createFile(logo);
            logoName = name;
        }
        let imgArray = [];
        if (files?.length) {
            for (let i = 0; i < files.length; i++) {
                const name = await this.filesService.createFile(files[i]);
                imgArray.push(name);
            }
        }

        const product = await this.prismaService.product.upsert({
            where: { name: dto.name },
            update: {
                name: dto.name ?? undefined,
                description: dto?.description ?? undefined,
            },
            create: {
                name: dto.name,
                description: dto?.description,
                price: Number(dto?.price) || 0,
                img: imgArray ?? undefined,
                logo: logoName ?? undefined,
                brandId: brand.id,
                typeId: type.id,
            },
        });

        const option = dto?.option ? JSON.parse(dto?.option) : undefined;

        if (option?.length) {
            for (let i = 0; i < option?.length; i++) {
                await this.optionService.create(option[i], product.id);
            }
        }

        return product;
    }

    async update(id: string, dto: UpdateProductDto, files: Array<Express.Multer.File>, logo: Express.Multer.File) {
        const curent_product = await this.prismaService.product.findUnique({ where: { id: id } });
        if (!curent_product) throw new BadRequestException('Нет такого товара для обновления');
        if (dto.name) {
            const prod = await this.prismaService.product.findUnique({ where: { name: dto.name } });
            if (prod?.id && prod?.id !== id)
                throw new BadRequestException(`Товар с названием ${dto.name} уже существует`);
        }
        let imgArray = [];
        if (files?.length) {
            for (let i = 0; i < files.length; i++) {
                const name = await this.filesService.createFile(files[i]);
                imgArray.push(name);
            }
        }
        let logoName = '';
        if (logo) {
            const name = await this.filesService.createFile(logo);
            logoName = name;
        }
        const product = await this.prismaService.product.update({
            where: { id: id },
            data: {
                name: dto?.name,
                description: dto?.description,
                price: Number(dto?.price) || 0,
                img: !imgArray.length ? undefined : imgArray,
                logo: logoName.length ? logoName : undefined,
            },
        });
        const option = dto?.option ? JSON.parse(dto?.option) : undefined;
        if (typeof option === 'object') {
            const list = await this.optionService.getList({ product_id: id });
            if (list?.length) {
                for (let d = 0; d < list.length; d++) {
                    await this.optionService.delete(list[d].id);
                }
            }
        }
        if (option?.length) {
            for (let i = 0; i < option.length; i++) {
                await this.optionService.create(option[i], id);
            }
        }
        return product;
    }

    async getList(filter?: FiltersInterface, sort?: string[] | any, range?: any) {
        let paramsArray = [];
        let paramsType = {};
        let paramsBrand = {};
        if (typeof filter?.typeId === 'object' && filter?.typeId.length) {
            if (filter?.typeId?.every((elem) => typeof Number(elem) === 'number')) {
                let inArr: number[] = [];
                for (let i = 0; i < filter.typeId.length; i++) {
                    inArr.push(Number(filter.typeId[i]));
                }
                paramsType = { typeId: { in: [...inArr] } };
            }
        } else if (!isNaN(Number(filter?.typeId))) {
            paramsType = { typeId: Number(filter?.typeId) };
        }

        if (typeof filter?.brandId === 'object' && filter?.brandId.length) {
            if (filter?.brandId?.every((elem) => typeof Number(elem) === 'number')) {
                let inArr: number[] = [];
                for (let i = 0; i < filter.brandId.length; i++) {
                    inArr.push(Number(filter.brandId[i]));
                }
                paramsBrand = { brandId: { in: [...inArr] } };
            }
        } else if (!isNaN(Number(filter?.brandId))) {
            paramsBrand = { brandId: Number(filter?.brandId) };
        }

        for (let param in filter) {
            FILTERS.map((i) => {
                this.filtering(paramsArray, param, filter, i);
            });
        }

        let sortCurent: any = ['name', 'ASC'];
        if (sort?.length && typeof sort === 'object') {
            if (sort[1] === 'ASC' || sort[1] === 'DESC') sortCurent = sort;
        }

        // console.log(sortCurent);
        const sortingParams = {
            where: {
                AND: [paramsType, paramsBrand, ...paramsArray],
            },
            orderBy: {
                id: sortCurent[0] === 'id' ? sortCurent[1].toLowerCase() : undefined,
                name: sortCurent[0] === 'name' ? sortCurent[1].toLowerCase() : undefined,
                price: sortCurent[0] === 'price' ? sortCurent[1].toLowerCase() : undefined,
                // rating: sort[0] === 'rating' ? sort[1].toLowerCase() : undefined,
            },
        };

        const count = await this.prismaService.product.count(sortingParams);
        const product = await this.prismaService.product.findMany({
            ...sortingParams,
            include: { options: true },
            take: isNaN(Number(range[0])) ? 5 : Number(range[0]),
            skip: isNaN(Number(range[1])) ? 0 : Number(range[1]),
        });
        // console.log(product);
        return { products: product, count };
    }

    async getOne(id: string) {
        if (!id) throw new BadRequestException('Не верный формат id');
        const product = this.prismaService.product.findUnique({
            where: { id },
            include: { options: true, type: true, brand: true },
        });
        return product;
    }

    async getManySearch(text: string) {
        if (!text || text.length > 50) return;
        const searchResult = await this.prismaService.product.findMany({
            where: {
                OR: [
                    { name: { contains: text, mode: 'insensitive' } },
                    { brand: { name: { contains: text, mode: 'insensitive' } } },
                    { type: { name: { contains: text, mode: 'insensitive' } } },
                ],
            },
            include: { type: true, brand: true },
        });

        return { data: searchResult, count: searchResult.length };
    }

    async getMany(ids: string[]) {
        const products = await this.prismaService.product.findMany({ where: { id: { in: [...ids] } } });
        return products;
    }

    async delete(id: string) {
        const del = await this.prismaService.product.delete({ where: { id } });
        return del;
    }
    async deleteMany(ids: string[]) {
        await this.prismaService.product.deleteMany({ where: { id: { in: [...ids] } } });
        return ids;
    }

    private filtering(paramsArray: any[], param: string, filters: FiltersInterface, filter: string[]) {
        if (param === filter[0]) {
            if (typeof filters[param] === 'string') {
                paramsArray.push({
                    options: { some: { title: filter[1], description: filters[param] } },
                });
            }
            if (typeof filters[param] === 'object' && filters[param].length) {
                const values = filters[param]?.map((i: string) => {
                    return { title: filter[1], description: String(i) };
                });
                paramsArray.push({
                    options: {
                        some: {
                            OR: [...values],
                        },
                    },
                });
            }
        }
    }
}
