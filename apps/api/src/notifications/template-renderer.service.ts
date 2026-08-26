import { BadRequestException, Injectable } from '@nestjs/common';

const VARIABLE_PATTERN = /\{\{\s*([\w.]+)\s*\}\}/g;

@Injectable()
export class TemplateRendererService {
  /** Missing data for a referenced variable is a clear error, never a silent blank. */
  render(template: string, data: Record<string, string>): string {
    return template.replace(VARIABLE_PATTERN, (_match, key: string) => {
      if (!(key in data)) {
        throw new BadRequestException(
          `Template references unknown variable "${key}".`,
        );
      }
      return data[key];
    });
  }
}
