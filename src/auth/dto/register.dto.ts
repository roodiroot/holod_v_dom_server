import { IsPasswordsMatchingConstraint } from '@common/decorators';
import { IsEmail, IsString, MinLength, Validate } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MinLength(6)
    password: string;

    @MinLength(6)
    @IsString()
    @Validate(IsPasswordsMatchingConstraint)
    passwordRepeat: string;
}
