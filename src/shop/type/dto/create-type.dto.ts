import { IsString, MinLength } from 'class-validator';

export class CreateTypeDto {
    @IsString()
    @MinLength(2)
    name: string;

    description?: string;
}
