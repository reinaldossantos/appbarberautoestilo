import Image from 'next/image';
import { getSettings } from '@/lib/data/public';
import { initialStory } from '@/lib/domain/story';
import { PageHeading } from '@/components/ui/page-heading';
import { createClient } from '@/lib/supabase/server';
export const metadata = { title: 'Conheça o Andrezinho' };
export default async function About() {
  const settings = await getSettings();
  const photo = settings?.photo_path
    ? (await createClient()).storage
        .from('business-images')
        .getPublicUrl(settings.photo_path).data.publicUrl
    : '/andrezinho.jpeg';
  return (
    <div className="container page-content">
      <div className="prose">
        <PageHeading
          eyebrow="Fé, trabalho e determinação"
          title="Conheça o Andrezinho."
        >
          A história por trás da Auto-estilo Barbershop.
        </PageHeading>
        {photo ? (
          <Image
            unoptimized={Boolean(settings?.photo_path)}
            src={photo}
            width={960}
            height={1280}
            sizes="(max-width: 640px) 90vw, 740px"
            alt="Andrezinho, profissional e proprietário da Auto-estilo Barbershop"
            style={{
              borderRadius: 12,
              objectFit: 'cover',
              width: '100%',
              height: 'auto',
            }}
          />
        ) : null}
        <blockquote>
          “Aos 13 anos, nasceu uma paixão. Aos 16, um sonho começou a se tornar
          realidade.”
        </blockquote>
        {(settings?.story || initialStory).split('\n\n').map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
    </div>
  );
}
