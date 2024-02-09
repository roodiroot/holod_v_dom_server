import { Body, ClassSerializerInterceptor, Controller, Delete, Get, Param, ParseUUIDPipe, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { UserService } from './user.service';
import { UserResponse } from './responses';
import { CurrentUser, Roles } from '@common/decorators';
import { JwtPayload } from '@auth/interfaces';
import { RolesGuard } from '@auth/guards/role.guard';
import { Role, User } from '@prisma/client';

@Controller('user')
export class UserController {
    constructor(private userService: UserService){}

    @UseInterceptors(ClassSerializerInterceptor)
    @Get(':idOrEmail')
    async findOneUser(@Param('idOrEmail') idOrEmail: string){
        const user = await this.userService.findOne(idOrEmail)
        return new UserResponse(user)
    }

    @Delete(":id")
    deleteUser(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload){
        return this.userService.delite(id, user)
    }

    @UseGuards(RolesGuard)
    @Roles(Role.ADMIN)
    @Get()
    my(@CurrentUser() user: JwtPayload){
        console.log('Тестируем роль ползователя')
        return user
    } 

    @UseInterceptors(ClassSerializerInterceptor)
    @Put()
    async updateUser(@Body() body: Partial<User>){
        const user = await this.userService.save(body)
        return new UserResponse(user)
        
    }
}
