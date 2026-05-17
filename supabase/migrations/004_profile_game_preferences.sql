alter table public.profiles
  add column show_legal_moves boolean not null default true,
  add column show_recommended_moves boolean not null default false,
  add column capture_input_mode text not null default 'full_move'
    check (capture_input_mode in ('full_move', 'step_by_step')),
  add column board_theme text not null default 'classic'
    check (board_theme in ('classic', 'walnut', 'slate', 'forest'));
