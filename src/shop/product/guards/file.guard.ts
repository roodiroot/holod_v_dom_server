import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileSizeValidationPipe implements PipeTransform {
    transform(value: { img: Array<Express.Multer.File>; logo: Express.Multer.File[] }, metadata: ArgumentMetadata) {
        if (!value?.img && !value?.logo) {
            return;
        }
        if (value?.img?.length)
            for (let i = 0; i < value.img.length; i++) {
                if (
                    (value.img[i].mimetype !== 'image/jpeg' && value.img[i].mimetype !== 'image/png') ||
                    value.img[i].size > 2000000
                ) {
                    throw new BadRequestException('Не подходящий размер или тип файлов');
                }
            }
        if (value?.logo?.length) {
            if (
                (value.logo[0].mimetype !== 'image/jpeg' && value.logo[0].mimetype !== 'image/png') ||
                value.logo[0].size > 2000000
            ) {
                throw new BadRequestException('Не подходящий размер или тип файлов логотипа');
            }
        }

        return { img: value?.img ?? undefined, logo: value?.logo ?? undefined };
    }
}
