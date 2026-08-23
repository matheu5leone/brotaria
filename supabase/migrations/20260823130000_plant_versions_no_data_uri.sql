-- image_url guarda ENDEREÇO de imagem, nunca a imagem inteira.
--
-- No começo do projeto o pipeline gravava o base64 direto na coluna; o upload
-- para o bucket veio depois. Sobrou uma linha de 2026-06-05 com meio mega de
-- data-URI, que entrava em toda query que lesse a tabela (histórico da planta,
-- acervo de artes). Ela foi movida para o storage por
-- scripts/migrate-data-uri-images.mjs.
--
-- O caminho de geração de hoje termina sempre em uploadToSupabase (que lança
-- erro em vez de devolver base64), então nada reescreve isso sozinho. A trava
-- existe porque o caminho de CLONE (plants.cloned_from) COPIA o image_url do
-- doador: bastava um data-URI entrar em qualquer linha para se espalhar pelas
-- cópias. Aqui o banco recusa na origem.
--
-- Só data-URI é bloqueado. Caminho relativo continua válido: o modo MOCK de
-- desenvolvimento grava '/imgs/brotaria.webp'.
alter table public.plant_versions
  add constraint plant_versions_image_url_nao_e_data_uri
  check (image_url is null or image_url not like 'data:%');
