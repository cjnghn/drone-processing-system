import { Logger } from '@nestjs/common';
import { CommandRunner, Command, Option } from 'nest-commander';

type CommandOptions = {
  id?: number;
};

@Command({
  name: 'sample1',
  options: { isDefault: true },
})
export class Sample1Command extends CommandRunner {
  private readonly logger = new Logger(Sample1Command.name);

  constructor() {
    super();
  }

  @Option({
    flags: '--id [number]',
  })
  parseId(value: string): number {
    return Number(value);
  }

  async run(passedParams: string[], options?: CommandOptions): Promise<void> {
    this.logger.log({ passedParams, options }, Sample1Command.name);
  }
}
