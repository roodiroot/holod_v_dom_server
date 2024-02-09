import { IsString, MinLength } from 'class-validator';

export class CreateProductDto {
    @IsString()
    @MinLength(2)
    name: string;

    @IsString()
    brandId: string;

    @IsString()
    typeId: string;

    description: string;

    price: number;

    option: string;
}
