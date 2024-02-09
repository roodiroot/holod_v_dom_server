import { IsString } from 'class-validator';

export class CreateOptionDto {
    @IsString()
    title: string;
    description: string;
}
