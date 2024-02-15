import { Public } from '@common/decorators';
import { Controller, Get, Query } from '@nestjs/common';
import { OptionService } from './option.service';

@Controller('option')
export class OptionController {
    constructor(private optionService: OptionService) {}

    @Public()
    @Get()
    async getList(@Query() params: { title?: string }) {
        if (params.title) return this.optionService.getOptionsForFilter(params.title);
        return null;
    }
}
