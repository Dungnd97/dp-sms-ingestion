import { Controller } from '@nestjs/common';
import { JobTransService } from './job-trans.service';

@Controller('job-trans')
export class JobTransController {
  constructor(private readonly jobTransService: JobTransService) {}
}
