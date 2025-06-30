import { Expose } from 'class-transformer'

export class StreamerInfoShareDto {
  @Expose({ name: 'slug_link' })
  slugLink: string

  @Expose({ name: 'sys_user_id' })
  sysUserId: string

  @Expose({ name: 'commission_donate' })
  commissionDonate: number

  @Expose({ name: 'path_url_music' })
  pathUrlMusic: string

  @Expose({ name: 'path_url_icon' })
  pathUrlIcon: string
}
