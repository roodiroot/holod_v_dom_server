import { JwtPayload } from '@auth/interfaces';
import { convertToSecondsUtil } from '@common/utils';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role, User } from '@prisma/client';
import { PrismaService } from '@prisma/prisma.service';
import { genSaltSync, hashSync } from 'bcrypt';
import { Cache } from 'cache-manager';
import { FilesService } from 'src/files/files.service';

@Injectable()
export class UserService {
    constructor(
        private prismaService: PrismaService, 
        @Inject(CACHE_MANAGER) private cacheManager: Cache,
        private configService: ConfigService,
        private filesService: FilesService
        ) {}

    async save(user: Partial<User>, ava?: Express.Multer.File) {
        const hashPassword = user?.password ? this.hashPassword(user.password) : null;
        const avatar = await this.filesService.createFile(ava)
        const savedUser = await this.prismaService.user.upsert({
            where: {email: user.email},
            update: {
                password: hashPassword ?? undefined,
                avatar: avatar ?? undefined,
                fullName: user?.fullName ?? undefined,
                roles: user?.roles ?? undefined,
                provider: user?.provider ?? undefined,
                isBlocked: user?.isBlocked ?? undefined
            },
            create: {
                email: user.email,
                password: hashPassword,
                avatar: avatar ?? null,
                fullName: user?.fullName ?? "Non Name",
                roles: ['USER'],
                provider: user?.provider
            },
        });
        this.cacheManager.set(savedUser.id, savedUser)
        this.cacheManager.set(savedUser.email, savedUser)
        return savedUser
    }

    async findOne(idOrEmail: string, isReset = false) {
        if(isReset){
            await this.cacheManager.del(idOrEmail)
        }
        const user = await this.cacheManager.get<User>(idOrEmail)
        if(!user){
            const user = await this.prismaService.user.findFirst({
                where: {
                    OR: [{ id: idOrEmail }, { email: idOrEmail }],
                },
            });
            if(!user){
                return null;
            }
            await this.cacheManager.set(idOrEmail, user, convertToSecondsUtil(this.configService.get('JWT_EXP')))
            return user;
        }
        return user;
    }

    async delite(id: string, user: JwtPayload) {
        const userDelete = await this.findOne(id)
        if(!userDelete){
            throw new UnauthorizedException(`пользователя с id ${id} не существует`)
        }
        if(id !== user.id && !user.roles.includes(Role.ADMIN)){
            throw new ForbiddenException('нет доступа')
        }
        await Promise.all([
            this.cacheManager.del(id),
            this.cacheManager.del(user.email),
        ])
        return this.prismaService.user.delete({ where: { id }, select: {id: true} });
    }

    private hashPassword(password: string) {
        return hashSync(password, genSaltSync(10));
    }
}
