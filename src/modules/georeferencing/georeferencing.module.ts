import { Module } from '@nestjs/common';
import { GeoreferencingProcessor } from './services/georeferencing.processor';

@Module({
  imports: [],
  providers: [GeoreferencingProcessor],
  exports: [GeoreferencingProcessor],
})
export class GeoreferencingModule {}
