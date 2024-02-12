import {
    Body,
    Controller,
    Post,
    Get,
    BadRequestException,
    UnauthorizedException,
    Res,
    HttpStatus,
    Req,
    UseInterceptors,
    ClassSerializerInterceptor,
    UseGuards,
    Query,
    UploadedFile,
    ParseFilePipe,
    FileTypeValidator,
    MaxFileSizeValidator,
    // NotAcceptableException,
} from '@nestjs/common';
import { LoginDto, RegisterDto } from './dto';
import { AuthService } from './auth.service';
import { Tokens } from './interfaces';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { Cookie, Public, UserAgent } from '@common/decorators';
import { UserResponse } from '@user/responses';
import { GoogleGuard } from './guards/google.guard';
import { HttpService } from '@nestjs/axios';
import { map, mergeMap, tap } from 'rxjs';
import { handleTimeoutAndErrors } from '@common/helpers';
import { YandexGuard } from './guards/yandex.guard';
import { Provider } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';

const REFRESH_TOKEN = 'refreshtoken';

@Public()
@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private configService: ConfigService,
        private httpService: HttpService,
    ) {}

    @UseInterceptors(FileInterceptor('img'), ClassSerializerInterceptor)
    @Post('register')
    async register(
        @UploadedFile(
            new ParseFilePipe({
                validators: [
                    new FileTypeValidator({ fileType: '.(png|jpeg|jpg)' }),
                    new MaxFileSizeValidator({ maxSize: 2600000 }),
                ],
            }),
        )
        img: Express.Multer.File,
        @Body() dto: RegisterDto,
    ) {
        const user = await this.authService.register(dto, img);
        if (!user) {
            throw new BadRequestException(
                `Не получется зарегестрировать пользователя с данными ${JSON.stringify(dto)}`,
            );
        }
        return new UserResponse(user);
    }

    @Post('login')
    async login(@Body() dto: LoginDto, @Res() res: Response, @UserAgent() agent: string) {
        const tokens = await this.authService.login(dto, agent);
        if (!tokens) {
            throw new BadRequestException(`Не получется войти с данными ${JSON.stringify(dto)}`);
        }
        this.setRefreshTokenToCookies(tokens, res);
    }

    @Get('logout')
    async logout(@Cookie(REFRESH_TOKEN) refreshToken: string, @Res() res: Response) {
        // console.log('logout');
        if (!refreshToken) {
            res.sendStatus(HttpStatus.OK);
            return;
        }
        res.cookie(REFRESH_TOKEN, '', {
            sameSite: 'none',
            expires: new Date(),
            secure: true,
        });
        await this.authService.deleteRefreshToken(refreshToken);
        res.sendStatus(HttpStatus.OK);
    }

    @Get('refresh-tokens')
    async refreshTokens(@Cookie(REFRESH_TOKEN) refreshToken: string, @Res() res: Response, @UserAgent() agent: string) {
        console.log(refreshToken);
        if (!refreshToken) {
            throw new UnauthorizedException();
        }
        const tokens = await this.authService.refreshToken(refreshToken, agent);

        if (!tokens?.refreshToken) {
            throw new UnauthorizedException();
        }
        this.setRefreshTokenToCookies(tokens, res);
    }

    private setRefreshTokenToCookies(tokens: Tokens, res: Response) {
        if (!tokens) {
            throw new UnauthorizedException();
        }
        res.cookie(REFRESH_TOKEN, tokens.refreshToken.token, {
            sameSite: 'none',
            expires: new Date(tokens.refreshToken.exp),
            secure: true,
            path: '/',
        });
        res.set({ 'access-control-expose-headers:': 'Set-Cookie' });
        res.status(HttpStatus.CREATED).json({ accessToken: tokens.accessToken });
    }

    @UseGuards(GoogleGuard)
    @Get('google')
    authGoogle() {
        return 'hello';
    }

    @UseGuards(GoogleGuard)
    @Get('google/callback')
    authGoogleCallback(@Req() req: Request, @Res() res: Response) {
        const token = req.user['accessToken'];
        return res.redirect(`http://localhost:3000/api/auth/success-google?token=${token}`);
    }

    @Get('success-google')
    successGoogle(@Query('token') token: string, @UserAgent() agent: string, @Res() res: Response) {
        return this.httpService.get(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${token}`).pipe(
            mergeMap(({ data: { email } }) => this.authService.propvderAuth(email, agent, Provider.GOOGLE)),
            map((data) => {
                this.setRefreshTokenToCookies(data, res);
            }),
            handleTimeoutAndErrors(),
        );
    }

    @UseGuards(YandexGuard)
    @Get('yandex')
    authYandex() {
        return 'hello';
    }

    @UseGuards(YandexGuard)
    @Get('yandex/callback')
    authYandexCallback(@Req() req: Request, @Res() res: Response) {
        const token = req.user['accessToken'];
        return res.redirect(`http://localhost:3000/api/auth/success-yandex?token=${token}`);
    }

    @Get('success-yandex')
    successYandex(@Query('token') token: string, @UserAgent() agent: string, @Res() res: Response) {
        return this.httpService.get(`https://login.yandex.ru/info?format=json&oauth_token=${token}`).pipe(
            mergeMap(({ data: { default_email } }) =>
                this.authService.propvderAuth(default_email, agent, Provider.YANDEX),
            ),
            map((data) => {
                this.setRefreshTokenToCookies(data, res);
            }),
            handleTimeoutAndErrors(),
        );
    }
}
