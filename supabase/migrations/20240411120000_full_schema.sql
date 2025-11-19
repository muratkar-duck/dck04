-- Enable required extensions
create extension if not exists "pgcrypto";

-- USERS TABLE
create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    username text unique,
    full_name text,
    bio text,
    avatar_url text,
    role text not null default 'writer' check (role in ('writer','producer','admin')),
    website_url text,
    instagram_url text,
    twitter_url text,
    representation text,
    location text
);

comment on table public.users is 'Profile table that mirrors Supabase Auth users.';

create or replace function public.set_updated_at()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language plpgsql;

create trigger set_timestamp
before update on public.users
for each row
execute function public.set_updated_at();

-- SCRIPTS TABLE
create table public.scripts (
    id uuid primary key default gen_random_uuid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    title text not null,
    logline text,
    synopsis text,
    genre text[] default '{}',
    format text,
    era text,
    setting_location_scope text,
    visibility text not null default 'private' check (visibility in ('public','producers_only','private')),
    is_archived boolean not null default false,
    primary_owner_id uuid not null references public.users(id) on delete cascade
);

create trigger set_timestamp
before update on public.scripts
for each row
execute function public.set_updated_at();

-- SCRIPT FILES
create table public.script_files (
    id uuid primary key default gen_random_uuid(),
    script_id uuid not null references public.scripts(id) on delete cascade,
    storage_path text not null,
    file_type text,
    file_size bigint,
    version text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger set_timestamp
before update on public.script_files
for each row
execute function public.set_updated_at();

-- SCRIPT OWNERS
create table public.script_owners (
    id uuid primary key default gen_random_uuid(),
    script_id uuid not null references public.scripts(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    ownership_percentage numeric(5,2) check (ownership_percentage >= 0 and ownership_percentage <= 100),
    role text default 'co_owner',
    created_at timestamptz not null default now()
);

create unique index script_owners_unique on public.script_owners(script_id, user_id);

-- SCRIPT COLLABORATORS
create table public.script_collaborators (
    id uuid primary key default gen_random_uuid(),
    script_id uuid not null references public.scripts(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    collaborator_role text,
    permissions text[] default '{}',
    created_at timestamptz not null default now()
);

create unique index script_collaborators_unique on public.script_collaborators(script_id, user_id);

-- PRODUCER LISTINGS
create table public.producer_listings (
    id uuid primary key default gen_random_uuid(),
    producer_id uuid not null references public.users(id) on delete cascade,
    title text not null,
    description text,
    genre text[] default '{}',
    format text,
    era text,
    setting_location_scope text,
    budget_min numeric,
    budget_max numeric,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger set_timestamp
before update on public.producer_listings
for each row
execute function public.set_updated_at();

-- APPLICATIONS
create table public.applications (
    id uuid primary key default gen_random_uuid(),
    script_id uuid not null references public.scripts(id) on delete cascade,
    listing_id uuid not null references public.producer_listings(id) on delete cascade,
    writer_id uuid not null references public.users(id) on delete cascade,
    producer_id uuid not null references public.users(id) on delete cascade,
    status text not null default 'pending' check (status in ('pending','accepted','rejected','withdrawn')),
    message text,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create unique index applications_unique on public.applications(listing_id, script_id, writer_id);

create trigger set_timestamp
before update on public.applications
for each row
execute function public.set_updated_at();

-- INTERESTS
create table public.interests (
    id uuid primary key default gen_random_uuid(),
    script_id uuid not null references public.scripts(id) on delete cascade,
    producer_id uuid not null references public.users(id) on delete cascade,
    note text,
    created_at timestamptz not null default now()
);

create unique index interests_unique on public.interests(script_id, producer_id);

-- SCRIPT VIEWS
create table public.script_views (
    id uuid primary key default gen_random_uuid(),
    script_id uuid not null references public.scripts(id) on delete cascade,
    viewer_id uuid references public.users(id) on delete set null,
    context text,
    created_at timestamptz not null default now()
);

-- CONVERSATIONS
create table public.conversations (
    id uuid primary key default gen_random_uuid(),
    topic text,
    origin_type text,
    origin_id uuid,
    is_archived boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger set_timestamp
before update on public.conversations
for each row
execute function public.set_updated_at();

-- CONVERSATION PARTICIPANTS
create table public.conversation_participants (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    user_id uuid not null references public.users(id) on delete cascade,
    participant_role text,
    joined_at timestamptz not null default now()
);

create unique index conversation_participants_unique on public.conversation_participants(conversation_id, user_id);

-- MESSAGES
create table public.messages (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    sender_id uuid not null references public.users(id) on delete cascade,
    body text not null,
    message_type text not null default 'text',
    is_deleted boolean not null default false,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger set_timestamp
before update on public.messages
for each row
execute function public.set_updated_at();

-- OFFERS
create table public.offers (
    id uuid primary key default gen_random_uuid(),
    conversation_id uuid not null references public.conversations(id) on delete cascade,
    script_id uuid not null references public.scripts(id) on delete cascade,
    sender_id uuid not null references public.users(id) on delete cascade,
    receiver_id uuid not null references public.users(id) on delete cascade,
    amount numeric(12,2) not null,
    currency text not null default 'TRY',
    status text not null default 'pending' check (status in ('pending','accepted','rejected','countered','cancelled')),
    valid_until timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger set_timestamp
before update on public.offers
for each row
execute function public.set_updated_at();

-- AUCTIONS
create table public.auctions (
    id uuid primary key default gen_random_uuid(),
    script_id uuid not null references public.scripts(id) on delete cascade,
    created_by uuid not null references public.users(id) on delete cascade,
    starts_at timestamptz not null default now(),
    ends_at timestamptz,
    reserve_price numeric(12,2),
    status text not null default 'active' check (status in ('active','closed','cancelled')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger set_timestamp
before update on public.auctions
for each row
execute function public.set_updated_at();

-- BIDS
create table public.bids (
    id uuid primary key default gen_random_uuid(),
    auction_id uuid not null references public.auctions(id) on delete cascade,
    bidder_id uuid not null references public.users(id) on delete cascade,
    amount numeric(12,2) not null,
    status text not null default 'active' check (status in ('active','outbid','withdrawn','accepted')),
    created_at timestamptz not null default now()
);

create unique index bids_unique on public.bids(auction_id, bidder_id, created_at);

-- NOTIFICATIONS
create table public.notifications (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null references public.users(id) on delete cascade,
    type text not null,
    payload jsonb,
    read_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create trigger set_timestamp
before update on public.notifications
for each row
execute function public.set_updated_at();

-- INDEXES
create index scripts_primary_owner_idx on public.scripts(primary_owner_id);
create index scripts_visibility_idx on public.scripts(visibility);
create index script_files_script_idx on public.script_files(script_id);
create index script_collaborators_user_idx on public.script_collaborators(user_id);
create index script_owners_user_idx on public.script_owners(user_id);
create index producer_listings_producer_idx on public.producer_listings(producer_id);
create index applications_script_idx on public.applications(script_id);
create index applications_writer_idx on public.applications(writer_id);
create index applications_producer_idx on public.applications(producer_id);
create index interests_script_idx on public.interests(script_id);
create index interests_producer_idx on public.interests(producer_id);
create index script_views_script_idx on public.script_views(script_id);
create index conversations_origin_idx on public.conversations(origin_type, origin_id);
create index messages_conversation_idx on public.messages(conversation_id);
create index messages_sender_idx on public.messages(sender_id);
create index offers_conversation_idx on public.offers(conversation_id);
create index offers_script_idx on public.offers(script_id);
create index auctions_script_idx on public.auctions(script_id);
create index auctions_creator_idx on public.auctions(created_by);
create index bids_auction_idx on public.bids(auction_id);
create index bids_bidder_idx on public.bids(bidder_id);
create index notifications_user_idx on public.notifications(user_id);

-- RLS POLICIES
alter table public.users enable row level security;
create policy "Users can view self" on public.users for select using (auth.uid() = id);
create policy "Users can update self" on public.users for update using (auth.uid() = id) with check (auth.uid() = id);

alter table public.scripts enable row level security;
create policy "Scripts visible to public" on public.scripts for select using (
    visibility = 'public' and auth.role() = 'authenticated'
);
create policy "Scripts visible to producers" on public.scripts for select using (
    visibility = 'producers_only' and exists (
        select 1 from public.users u where u.id = auth.uid() and u.role = 'producer'
    )
);
create policy "Scripts visible to owners" on public.scripts for select using (
    auth.uid() = primary_owner_id or auth.uid() in (
        select user_id from public.script_owners so where so.script_id = public.scripts.id
    )
);
create policy "Script owners manage" on public.scripts for insert with check (auth.uid() = primary_owner_id);
create policy "Script owners update" on public.scripts for update using (auth.uid() = primary_owner_id);

alter table public.script_files enable row level security;
create policy "Script files follow script visibility" on public.script_files for select using (
    exists (
        select 1 from public.scripts s where s.id = script_id and (
            (s.visibility = 'public' and auth.role() = 'authenticated') or
            (s.visibility = 'producers_only' and exists (
                select 1 from public.users u where u.id = auth.uid() and u.role = 'producer'
            )) or
            (auth.uid() = s.primary_owner_id) or
            (auth.uid() in (select user_id from public.script_owners so where so.script_id = s.id))
        )
    )
);

alter table public.script_owners enable row level security;
create policy "Owners can see their scripts" on public.script_owners for select using (
    auth.uid() = user_id or auth.uid() in (
        select primary_owner_id from public.scripts s where s.id = script_id
    )
);

alter table public.script_collaborators enable row level security;
create policy "Collaborators can view" on public.script_collaborators for select using (
    auth.uid() = user_id or auth.uid() in (
        select primary_owner_id from public.scripts s where s.id = script_id
    )
);

alter table public.producer_listings enable row level security;
create policy "Listings readable to auth" on public.producer_listings for select using (auth.role() = 'authenticated');
create policy "Producer manages listing" on public.producer_listings for all using (auth.uid() = producer_id) with check (auth.uid() = producer_id);

alter table public.applications enable row level security;
create policy "Application parties can read" on public.applications for select using (
    auth.uid() = writer_id or auth.uid() = producer_id
);
create policy "Writers insert applications" on public.applications for insert with check (auth.uid() = writer_id);
create policy "Parties update status" on public.applications for update using (auth.uid() = writer_id or auth.uid() = producer_id);

alter table public.interests enable row level security;
create policy "Only producers insert interest" on public.interests for insert with check (
    exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'producer') and auth.uid() = producer_id
);
create policy "Owners and producers read interest" on public.interests for select using (
    auth.uid() = producer_id or auth.uid() in (
        select primary_owner_id from public.scripts s where s.id = script_id
    )
);

alter table public.script_views enable row level security;
create policy "Script owners see views" on public.script_views for select using (
    auth.uid() in (
        select primary_owner_id from public.scripts s where s.id = script_id
    )
);

alter table public.conversations enable row level security;
create policy "Participants read conversations" on public.conversations for select using (
    exists (
        select 1 from public.conversation_participants cp where cp.conversation_id = public.conversations.id and cp.user_id = auth.uid()
    )
);

alter table public.conversation_participants enable row level security;
create policy "Participants see membership" on public.conversation_participants for select using (
    auth.uid() = user_id or exists (
        select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
);

alter table public.messages enable row level security;
create policy "Participants read messages" on public.messages for select using (
    exists (
        select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
);
create policy "Participants send messages" on public.messages for insert with check (
    auth.uid() = sender_id and exists (
        select 1 from public.conversation_participants cp where cp.conversation_id = conversation_id and cp.user_id = auth.uid()
    )
);

alter table public.offers enable row level security;
create policy "Offer parties read" on public.offers for select using (
    auth.uid() in (sender_id, receiver_id) or auth.uid() in (
        select primary_owner_id from public.scripts s where s.id = script_id
    )
);

alter table public.auctions enable row level security;
create policy "Auction parties read" on public.auctions for select using (
    auth.uid() = created_by or auth.uid() in (
        select primary_owner_id from public.scripts s where s.id = script_id
    )
);

alter table public.bids enable row level security;
create policy "Bidders and owners view bids" on public.bids for select using (
    auth.uid() = bidder_id or auth.uid() in (
        select primary_owner_id from public.scripts s join public.auctions a on a.script_id = s.id where a.id = auction_id
    )
);

alter table public.notifications enable row level security;
create policy "Users read notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "System inserts notifications" on public.notifications for insert with check (auth.role() = 'service_role');
