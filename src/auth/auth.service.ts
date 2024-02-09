import {
    Injectable,
    Logger,
    UnauthorizedException,
    ConflictException,
    BadRequestException,
    HttpException,
    HttpStatus,
    NotAcceptableException,
} from '@nestjs/common';
import { UserService } from '@user/user.service';
import { LoginDto, RegisterDto } from './dto';
import { Tokens } from './interfaces';
import { compareSync } from 'bcrypt';
import { Provider, Token, User } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '@prisma/prisma.service';
import { v4 } from 'uuid';
import { add } from 'date-fns';

@Injectable()
export class AuthService {
    private logger = new Logger(AuthService.name);
    constructor(
        private userService: UserService,
        private jwtService: JwtService,
        private prismaService: PrismaService,
    ) {}

    async register(dto: RegisterDto, img: Express.Multer.File) {
        const user: User = await this.userService.findOne(dto.email).catch((err) => {
            this.logger.error(err);
            return null;
        });
        if (user) {
            throw new ConflictException('Пользователь с таким email уже существует');
        }
        return this.userService.save(dto, img).catch((err) => {
            this.logger.error(err);
            return null;
        });
    }

    async login(dto: LoginDto, agent: string): Promise<Tokens> {
        const user: User = await this.userService.findOne(dto.email, true).catch((err) => {
            this.logger.error(err);
            return null;
        });
        if (!user || !compareSync(dto.password, user.password)) {
            throw new UnauthorizedException('Не верный логин или пароль');
        }
        return await this.generateTokens(user, agent);
    }

    async refreshToken(refreshToken: string, agent: string): Promise<Tokens> {
        const oldTocken = await this.prismaService.token.findFirst({ where: { token: refreshToken } });
        if (!oldTocken) {
            throw new UnauthorizedException();
        }
        let token: { token: string; exp: Date; userAgent: string; userId: string } | undefined = undefined;
        try {
            token = await this.prismaService.token.delete({ where: { token: refreshToken } });
        } catch (error) {
            throw new UnauthorizedException('Странная ошибка');
        }
        if (!token || new Date(token.exp) < new Date()) {
            throw new UnauthorizedException();
        }
        const user = await this.userService.findOne(token.userId);
        return this.generateTokens(user, agent);
    }

    private async generateTokens(user: User, agent: string): Promise<Tokens> {
        const accessToken =
            'Bearer ' +
            this.jwtService.sign({
                id: user.id,
                email: user.email,
                avatar: user.avatar,
                fullName: user.fullName,
                roles: user.roles,
            });

        const refreshToken = await this.getRefreshToken(user.id, agent);

        return { accessToken, refreshToken };
    }

    private async getRefreshToken(userId: string, agent: string): Promise<Token> {
        const token = await this.prismaService.token.findFirst({
            where: { userId, userAgent: agent },
        });
        return this.prismaService.token.upsert({
            where: { token: token?.token || '' },
            update: {
                token: v4(),
                exp: add(new Date(), { months: 1 }),
            },
            create: {
                token: v4(),
                exp: add(new Date(), { months: 1 }),
                userId,
                userAgent: agent,
            },
        });
    }

    async deleteRefreshToken(token: string) {
        if (token) {
            const oldTocken = await this.prismaService.token.findFirst({ where: { token: token } });
            if (!oldTocken) {
                throw new UnauthorizedException();
            }
            try {
                await this.prismaService.token.delete({ where: { token } });
            } catch (error) {
                throw new UnauthorizedException('Странная ошибка');
            }
        }
    }

    async propvderAuth(email: string, agent: string, provider: Provider) {
        const userExist = await this.userService.findOne(email);
        if (userExist) {
            const user = await this.userService.save({ email, provider }).catch((err) => {
                this.logger.error(err);
                return null;
            });
            return this.generateTokens(user, agent);
        }
        const user = await this.userService.save({ email, provider }).catch((err) => {
            this.logger.error(err);
            return null;
        });
        if (!user) {
            throw new HttpException(`Неполучилось создать пользователя с email ${email}`, HttpStatus.BAD_REQUEST);
        }
        return this.generateTokens(user, agent);
    }
}
