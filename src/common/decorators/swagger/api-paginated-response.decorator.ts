import { applyDecorators, Type } from '@nestjs/common';
import { ApiExtraModels, getSchemaPath, ApiOkResponse } from '@nestjs/swagger';
import { ResponseDto, PaginationMetaDto } from '../../dto/response.dto';

interface ApiResponseOptions {
  model: Type<any>;
  isArray?: boolean;
  paginated?: boolean;
}

export const ApiResponseDto = ({ model, isArray = false, paginated = false }: ApiResponseOptions) => {
  const dataSchema = isArray
    ? {
        type: 'array',
        items: { $ref: getSchemaPath(model) },
      }
    : { $ref: getSchemaPath(model) };

  const responseSchema: any = {
    allOf: [
      { $ref: getSchemaPath(ResponseDto) },
      {
        properties: {
          data: dataSchema,
        },
      },
    ],
  };

  if (paginated) {
    responseSchema.allOf[1].properties.meta = { $ref: getSchemaPath(PaginationMetaDto) };
  }

  return applyDecorators(
    ApiExtraModels(ResponseDto, model, PaginationMetaDto),
    ApiOkResponse({ schema: responseSchema }),
  );
};
