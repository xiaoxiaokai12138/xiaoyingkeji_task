CREATE TABLE templates (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    category VARCHAR(40) NOT NULL,
    description VARCHAR(500) NOT NULL,
    cover_file VARCHAR(100) NOT NULL,
    required_image_count INT NOT NULL,
    accepted_mime_types VARCHAR(255) NOT NULL,
    max_file_size_bytes BIGINT NOT NULL,
    sort_order INT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO templates VALUES
('demo-postcard', '山海来信', '创意图片', '把旅途中的两张照片，装进一封寄给未来的明信片。模拟制作会为你生成可预览的图片结果。', 'postcard.svg', 2, 'image/jpeg,image/png', 5242880, 1),
('demo-portrait', '光影肖像', '人像风格', '上传一张人像，留住光线与情绪交汇的瞬间。使用可控的模拟生成流程。', 'portrait.svg', 1, 'image/jpeg,image/png', 5242880, 2),
('demo-pet', '毛茸茸日记', '生活灵感', '为你的毛茸茸朋友制作一张日常纪念图片。上传一张清晰照片即可开始。', 'pet.svg', 1, 'image/jpeg,image/png', 5242880, 3),
('demo-city', '城市漫游', '创意图片', '用两张城市照片记录街角、建筑与晚风，模拟制作属于你的城市故事。', 'city.svg', 2, 'image/jpeg,image/png', 5242880, 4),
('demo-garden', '花间片刻', '生活灵感', '让平凡的生活多一点自然色彩。上传一张图片，体验完整的素材制作流程。', 'garden.svg', 1, 'image/jpeg,image/png', 5242880, 5),
('demo-film', '昨日胶片', '人像风格', '从一张照片开始，收藏值得记住的日常。模拟生成结果可在个人历史中查看。', 'film.svg', 1, 'image/jpeg,image/png', 5242880, 6);
