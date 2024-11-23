import { Module } from '@nestjs/common';
import { Sample1Command } from './commands/sample1.command';
import { ProcessFlightCommand } from './commands/process-flight.command';
import { ProcessorModule } from '@/modules/processor/processor.module';

@Module({
  imports: [ProcessorModule],
  providers: [Sample1Command, ProcessFlightCommand],
})
export class CLIModule {}
