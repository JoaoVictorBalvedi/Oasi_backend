-- Update product image paths to match the actual PNG files
UPDATE produtos 
SET imagem_url = CASE nome
    WHEN 'Ecobag de Algodão Orgânico' THEN '/ecobag.png'
    WHEN 'Kit Escovas de Dente de Bambu (4un)' THEN '/escova.png'
    WHEN 'Garrafa Térmica Inox Sustentável' THEN '/garrafa.png'
    WHEN 'Canudos de Inox Reutilizáveis (Kit)' THEN '/canudo.png'
    WHEN 'Vaso Auto Irrigável Pequeno' THEN '/vaso.png'
    WHEN 'Caderno Ecológico Reciclado' THEN '/caderno.png'
END
WHERE nome IN (
    'Ecobag de Algodão Orgânico',
    'Kit Escovas de Dente de Bambu (4un)',
    'Garrafa Térmica Inox Sustentável',
    'Canudos de Inox Reutilizáveis (Kit)',
    'Vaso Auto Irrigável Pequeno',
    'Caderno Ecológico Reciclado'
); 