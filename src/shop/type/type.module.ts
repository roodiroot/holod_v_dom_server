import { Module } from '@nestjs/common';
import { TypeService } from './type.service';
import { TypeController } from './type.controller';
import { FilesModule } from 'src/files/files.module';

@Module({
  providers: [TypeService],
  controllers: [TypeController],
  exports: [TypeService],
  imports: [FilesModule]
})
export class TypeModule {}
