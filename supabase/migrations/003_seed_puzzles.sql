-- 003_seed_puzzles.sql
-- Seeds 30 Russian shashki puzzles.
--
-- Position JSON format matches CreateGameStateOptions from lib/engine/board.ts:
--   { whiteMen, whiteKings, blackMen, blackKings }
--   (sideToMove stored in the separate column)
--
-- solution_moves is a JSON array whose first element is the required compound
-- move notation (e.g. "c5:e7" for a single capture, "c3:a5:c7" for a chain).
--
-- Board: row 0 = rank 8 (white promotes here), row 7 = rank 1.
-- Playable squares satisfy (row + col) % 2 = 1.
-- All positions have been verified against the engine's coordinate system.

insert into public.puzzles
  (slug, position, side_to_move, solution_moves, theme, difficulty, explanation_ru, explanation_en)
values

-- ── Difficulty 1: single forward capture (8 puzzles) ────────────────────────

('p01-single-c5',
 '{"whiteMen":["c5"],"whiteKings":[],"blackMen":["d6"],"blackKings":[]}'::jsonb,
 'white', '["c5:e7"]'::jsonb, 'basic_capture', 1,
 'Белая шашка на c5 обязана взять шашку противника на d6 и приземлиться на e7.',
 'The white man on c5 must capture the opponent''s piece on d6, landing on e7.'),

('p02-single-e5',
 '{"whiteMen":["e5"],"whiteKings":[],"blackMen":["f6"],"blackKings":[]}'::jsonb,
 'white', '["e5:g7"]'::jsonb, 'basic_capture', 1,
 'Единственный доступный ход — взятие шашки противника с приземлением на g7.',
 'The only available move is capturing the opponent''s piece to land on g7.'),

('p03-single-a5',
 '{"whiteMen":["a5"],"whiteKings":[],"blackMen":["b6"],"blackKings":[]}'::jsonb,
 'white', '["a5:c7"]'::jsonb, 'basic_capture', 1,
 'Шашка a5 перепрыгивает через b6 на c7 — обязательное взятие.',
 'The piece on a5 jumps over b6 to c7 — mandatory capture.'),

('p04-single-g5',
 '{"whiteMen":["g5"],"whiteKings":[],"blackMen":["f6"],"blackKings":[]}'::jsonb,
 'white', '["g5:e7"]'::jsonb, 'basic_capture', 1,
 'Взятие с g5 через f6 на e7 — простое обязательное взятие.',
 'Capture from g5 over f6 to e7 — a simple mandatory capture.'),

('p05-single-b4',
 '{"whiteMen":["b4"],"whiteKings":[],"blackMen":["c5"],"blackKings":[]}'::jsonb,
 'white', '["b4:d6"]'::jsonb, 'basic_capture', 1,
 'Шашка b4 берёт c5 и приземляется на d6.',
 'The man on b4 captures c5 and lands on d6.'),

('p06-single-d4-left',
 '{"whiteMen":["d4"],"whiteKings":[],"blackMen":["c5"],"blackKings":[]}'::jsonb,
 'white', '["d4:b6"]'::jsonb, 'basic_capture', 1,
 'Взятие влево: d4 берёт c5 и уходит на b6.',
 'Left-side capture: d4 takes c5 and lands on b6.'),

('p07-single-f4',
 '{"whiteMen":["f4"],"whiteKings":[],"blackMen":["g5"],"blackKings":[]}'::jsonb,
 'white', '["f4:h6"]'::jsonb, 'basic_capture', 1,
 'Шашка f4 прыгает через g5 к краю доски на h6.',
 'The man on f4 leaps over g5 to the board edge at h6.'),

('p08-single-d4-right',
 '{"whiteMen":["d4"],"whiteKings":[],"blackMen":["e5"],"blackKings":[]}'::jsonb,
 'white', '["d4:f6"]'::jsonb, 'basic_capture', 1,
 'Взятие вправо: d4 берёт e5 и уходит на f6.',
 'Right-side capture: d4 takes e5 and lands on f6.'),

-- ── Difficulty 2: double capture (10 puzzles) ─────────────────────────────

('p09-double-c3-left',
 '{"whiteMen":["c3"],"whiteKings":[],"blackMen":["b4","b6"],"blackKings":[]}'::jsonb,
 'white', '["c3:a5:c7"]'::jsonb, 'double_capture', 2,
 'Серийное взятие: c3 берёт b4 (→a5), затем b6 (→c7).',
 'Chain capture: c3 takes b4 (→a5), then b6 (→c7).'),

('p10-double-g3',
 '{"whiteMen":["g3"],"whiteKings":[],"blackMen":["f4","d6"],"blackKings":[]}'::jsonb,
 'white', '["g3:e5:c7"]'::jsonb, 'double_capture', 2,
 'g3 берёт f4 на e5, затем берёт d6 и финишируют на c7.',
 'g3 takes f4 to e5, then takes d6 and finishes on c7.'),

('p11-double-a3',
 '{"whiteMen":["a3"],"whiteKings":[],"blackMen":["b4","d6"],"blackKings":[]}'::jsonb,
 'white', '["a3:c5:e7"]'::jsonb, 'double_capture', 2,
 'Два взятия по диагонали: a3→c5→e7, убирая b4 и d6.',
 'Two diagonal captures: a3→c5→e7, removing b4 and d6.'),

('p12-double-e3-left',
 '{"whiteMen":["e3"],"whiteKings":[],"blackMen":["d4","b6"],"blackKings":[]}'::jsonb,
 'white', '["e3:c5:a7"]'::jsonb, 'double_capture', 2,
 'Серийное взятие влево: e3→c5→a7, убирая d4 и b6.',
 'Left-side chain: e3→c5→a7, removing d4 and b6.'),

('p13-double-c3-right',
 '{"whiteMen":["c3"],"whiteKings":[],"blackMen":["d4","f6"],"blackKings":[]}'::jsonb,
 'white', '["c3:e5:g7"]'::jsonb, 'double_capture', 2,
 'c3 берёт d4 на e5, затем берёт f6 на g7.',
 'c3 takes d4 to e5, then takes f6 to g7.'),

('p14-double-backward-e7',
 '{"whiteMen":["e7"],"whiteKings":[],"blackMen":["d6","b4"],"blackKings":[]}'::jsonb,
 'white', '["e7:c5:a3"]'::jsonb, 'backward_capture', 2,
 'В русских шашках шашки берут и назад! e7 берёт d6 назад (→c5), затем b4 (→a3).',
 'In Russian draughts men capture backward too! e7 takes d6 backward (→c5), then b4 (→a3).'),

('p15-double-backward-c7',
 '{"whiteMen":["c7"],"whiteKings":[],"blackMen":["b6","b4"],"blackKings":[]}'::jsonb,
 'white', '["c7:a5:c3"]'::jsonb, 'backward_capture', 2,
 'c7 берёт назад через b6 на a5, затем снова назад через b4 на c3.',
 'c7 captures backward over b6 to a5, then again backward over b4 to c3.'),

('p16-double-backward-g7',
 '{"whiteMen":["g7"],"whiteKings":[],"blackMen":["f6","d4"],"blackKings":[]}'::jsonb,
 'white', '["g7:e5:c3"]'::jsonb, 'backward_capture', 2,
 'g7 берёт f6 назад на e5, затем d4 назад на c3.',
 'g7 takes f6 backward to e5, then d4 backward to c3.'),

('p17-double-backward-a5',
 '{"whiteMen":["a5"],"whiteKings":[],"blackMen":["b4","d2"],"blackKings":[]}'::jsonb,
 'white', '["a5:c3:e1"]'::jsonb, 'backward_capture', 2,
 'a5 берёт b4 назад на c3, затем d2 назад, достигая e1.',
 'a5 takes b4 backward to c3, then d2 backward to reach e1.'),

-- ── Difficulty 3: triple capture (6 puzzles) ──────────────────────────────

('p18-triple-g3-mixed',
 '{"whiteMen":["g3"],"whiteKings":[],"blackMen":["f4","d6","b6"],"blackKings":[]}'::jsonb,
 'white', '["g3:e5:c7:a5"]'::jsonb, 'triple_capture', 3,
 'Три взятия! g3→e5 (f4), e5→c7 (d6), c7→a5 (взятие b6 назад).',
 'Three captures! g3→e5 (takes f4), e5→c7 (takes d6), c7→a5 (takes b6 backward).'),

('p19-triple-a3-mixed',
 '{"whiteMen":["a3"],"whiteKings":[],"blackMen":["b4","d6","f6"],"blackKings":[]}'::jsonb,
 'white', '["a3:c5:e7:g5"]'::jsonb, 'triple_capture', 3,
 'a3 берёт b4→c5, c5 берёт d6→e7, e7 берёт f6 назад на g5.',
 'a3 takes b4→c5, c5 takes d6→e7, e7 takes f6 backward to g5.'),

('p20-triple-backward-a7',
 '{"whiteMen":["a7"],"whiteKings":[],"blackMen":["b6","d4","f2"],"blackKings":[]}'::jsonb,
 'white', '["a7:c5:e3:g1"]'::jsonb, 'triple_capture', 3,
 'Тройное взятие назад: a7 убирает b6, d4, f2 по одной диагонали.',
 'Triple backward capture: a7 removes b6, d4, f2 along one diagonal.'),

('p21-triple-backward-e7',
 '{"whiteMen":["e7"],"whiteKings":[],"blackMen":["d6","b4","b2"],"blackKings":[]}'::jsonb,
 'white', '["e7:c5:a3:c1"]'::jsonb, 'triple_capture', 3,
 'e7 берёт назад d6→c5, затем b4→a3, затем b2→c1.',
 'e7 takes backward d6→c5, then b4→a3, then b2→c1.'),

('p22-triple-double-bwd-a7',
 '{"whiteMen":["a7"],"whiteKings":[],"blackMen":["b6","d4"],"blackKings":[]}'::jsonb,
 'white', '["a7:c5:e3"]'::jsonb, 'backward_capture', 3,
 'a7 берёт назад: b6→c5, затем d4→e3. Двойное взятие назад от 7-й линии.',
 'a7 captures backward: b6→c5, then d4→e3. Double backward chain from the 7th rank.'),

('p23-triple-double-bwd-c7',
 '{"whiteMen":["c7"],"whiteKings":[],"blackMen":["d6","f4"],"blackKings":[]}'::jsonb,
 'white', '["c7:e5:g3"]'::jsonb, 'backward_capture', 3,
 'c7 берёт d6 назад на e5, затем берёт f4 назад на g3.',
 'c7 takes d6 backward to e5, then takes f4 backward to g3.'),

-- ── Difficulty 4: promotion (3 puzzles) ────────────────────────────────────

('p24-promote-b6',
 '{"whiteMen":["b6"],"whiteKings":[],"blackMen":["c7"],"blackKings":[]}'::jsonb,
 'white', '["b6:d8"]'::jsonb, 'promotion', 4,
 'Шашка b6 берёт c7 и попадает на восьмую линию — становится дамкой!',
 'The man on b6 captures c7 and reaches the eighth rank — it becomes a king!'),

('p25-promote-f6',
 '{"whiteMen":["f6"],"whiteKings":[],"blackMen":["e7"],"blackKings":[]}'::jsonb,
 'white', '["f6:d8"]'::jsonb, 'promotion', 4,
 'f6 берёт e7 и превращается в дамку на d8.',
 'f6 captures e7 and promotes to a king on d8.'),

('p26-promote-continue',
 '{"whiteMen":["b6"],"whiteKings":[],"blackMen":["c7","f6"],"blackKings":[]}'::jsonb,
 'white', '["b6:d8:g5"]'::jsonb, 'promotion', 4,
 'b6 берёт c7 и становится дамкой на d8. Дамка сразу продолжает: берёт f6 и приземляется на g5.',
 'b6 captures c7 and crowns to a king on d8. The new king continues immediately: takes f6 to land on g5.'),

-- ── Difficulty 5: king captures (3 puzzles) ────────────────────────────────

('p27-king-single',
 '{"whiteMen":[],"whiteKings":["a1"],"blackMen":["e5"],"blackKings":[]}'::jsonb,
 'white', '["a1:f6"]'::jsonb, 'king_capture', 5,
 'Дамка a1 «летит» по длинной диагонали и бьёт шашку на e5, приземляясь на f6.',
 'The king on a1 flies along the long diagonal and captures the man on e5, landing on f6.'),

('p28-king-double',
 '{"whiteMen":[],"whiteKings":["h8"],"blackMen":["e5","b2"],"blackKings":[]}'::jsonb,
 'white', '["h8:c3:a1"]'::jsonb, 'king_capture', 5,
 'Дамка h8 бьёт e5 (приземляется на c3), затем бьёт b2 (приземляется на a1).',
 'The king on h8 takes e5 (lands on c3), then takes b2 (lands on a1).'),

('p29-king-triple',
 '{"whiteMen":[],"whiteKings":["h2"],"blackMen":["g3","e5","c7"],"blackKings":[]}'::jsonb,
 'white', '["h2:f4:d6:b8"]'::jsonb, 'king_capture', 5,
 'Дамка h2 сметает три шашки: g3→f4, e5→d6, c7→b8. Тройное взятие дамкой!',
 'The king on h2 sweeps three pieces: g3→f4, e5→d6, c7→b8. Triple king capture!'),

('p30-king-diagonal',
 '{"whiteMen":[],"whiteKings":["a1"],"blackMen":["b2","d4","f6"],"blackKings":[]}'::jsonb,
 'white', '["a1:c3:e5:g7"]'::jsonb, 'king_capture', 5,
 'Дамка a1 сметает всю диагональ: бьёт b2, d4, f6 одним серийным ходом.',
 'The king on a1 clears the whole diagonal: it captures b2, d4, and f6 in one chain move.');
