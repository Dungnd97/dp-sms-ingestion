import { Expose } from 'class-transformer'

export class GetTokenDTO {
  @Expose({ name: 'accessToken' })
  accessToken?: string

  @Expose({ name: 'refreshToken' })
  refreshToken?: string
}
