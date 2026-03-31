from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session
from app.core.security import get_password_hash
from app.models import Achievement, CoinTransaction, Event, Participation, Team, User
from app.services.achievements import ensure_default_achievements


def seed_database(db: Session):
    if db.query(User).count() > 0:
        return

    teams = [
        Team(name="Команда Москва", city="Москва", description="Флагманская команда штаба"),
        Team(name="Команда Казань", city="Казань", description="Школьные и студенческие события"),
        Team(name="Команда Новосибирск", city="Новосибирск", description="Региональные киберуроки"),
        Team(name="Команда Самара", city="Самара", description="Медиа и просветительские инициативы"),
        Team(name="Команда Екатеринбург", city="Екатеринбург", description="Форумы и профориентация"),
    ]
    db.add_all(teams)
    db.commit()

    now = datetime.now(timezone.utc)
    users_data = [
        ("Координатор Софа", "coord@beeline.local", "coord12345", "organizer", 0, "Москва", "coordinator_sofa", "+79990000002", 8, "Координирую волонтёрскую программу и события по регионам."),
        ("Ирина Крылова", "volunteer@beeline.local", "vol12345", "volunteer", 1, "Казань", "irina_vol", "+79990000003", 5, "Провожу лекции по кибербезопасности для школьников."),
        ("Натмия Ларокеа", "natmia@beeline.local", "vol12345", "volunteer", 1, "Казань", "natmia_safe", "+79990000011", 6, "Организую активности для студентов и фотоотчёты."),
        ("Лидие Крылоева", "lidiya@beeline.local", "vol12345", "volunteer", 0, "Москва", "lida_team", "+79990000012", 10, "Наставник команды, работаю с младшими группами."),
        ("Напир Казань", "napir@beeline.local", "vol12345", "volunteer", 1, "Казань", "napir_team", "+79990000013", 7, "Отвечаю за организационную помощь и набор волонтёров."),
        ("Мария Леевна", "maria@beeline.local", "vol12345", "volunteer", 2, "Новосибирск", "maria_secure", "+79990000014", 9, "Веду крупные лекции для подростков и родителей."),
        ("Анна Сабичева", "anna@beeline.local", "vol12345", "volunteer", 2, "Новосибирск", "anna_safe", "+79990000015", 4, "Люблю интерактивные форматы и квизы по безопасности."),
        ("Павел Громов", "pavel@beeline.local", "vol12345", "volunteer", 3, "Самара", "pavel_media", "+79990000016", 6, "Снимаю и собираю фотоотчёты по мероприятиям."),
        ("Вера Миронова", "vera@beeline.local", "vol12345", "volunteer", 3, "Самара", "vera_team", "+79990000017", 3, "Работаю с родительской аудиторией."),
        ("Олег Титов", "oleg@beeline.local", "vol12345", "volunteer", 4, "Екатеринбург", "oleg_forum", "+79990000018", 11, "Веду форумы, профориентацию и встречи с компаниями."),
        ("Кира Новикова", "kira@beeline.local", "vol12345", "volunteer", 4, "Екатеринбург", "kira_cyber", "+79990000019", 8, "Делаю воркшопы и школьные интенсивы."),
        ("Антон Дёмин", "anton@beeline.local", "vol12345", "volunteer", 0, "Москва", "anton_vol", "+79990000020", 2, "Помогаю на площадках и в регистрации участников."),
        ("Екатерина Рябова", "katya@beeline.local", "vol12345", "volunteer", 2, "Новосибирск", "katya_cyber", "+79990000021", 6, "Провожу мастер-классы по цифровой безопасности для старших классов."),
        ("Руслан Хакимов", "ruslan@beeline.local", "vol12345", "volunteer", 1, "Казань", "ruslan_help", "+79990000022", 5, "Координирую регистрацию и помогаю команде на выездных событиях."),
        ("Алина Полякова", "alina@beeline.local", "vol12345", "volunteer", 4, "Екатеринбург", "alina_workshop", "+79990000023", 7, "Делаю мастер-классы и интерактивы по защите аккаунтов."),
        ("Даниил Орлов", "daniil@beeline.local", "vol12345", "volunteer", 3, "Самара", "daniil_media", "+79990000024", 4, "Веду фото и видеосопровождение мероприятий."),
    ]

    users = []
    for i, (name, email, password, role, team_idx, city, tg, phone, streak, about) in enumerate(users_data):
        user = User(
            name=name,
            email=email,
            password_hash=get_password_hash(password),
            role=role,
            status="active",
            team_id=teams[team_idx].id,
            city=city,
            telegram_username=tg,
            phone=phone,
            streak_weeks=streak,
            about=about,
            last_activity_at=now - timedelta(days=(i % 5) * 12),
        )
        if i in (6, 8):
            user.status = "inactive"
            user.last_activity_at = now - timedelta(days=200 + i)
        users.append(user)
    db.add_all(users)
    db.commit()

    teams[0].leader_id = users[3].id
    teams[1].leader_id = users[1].id
    teams[2].leader_id = users[5].id
    teams[3].leader_id = users[7].id
    teams[4].leader_id = users[9].id
    db.commit()

    event_specs = [
        ("Лекция по цифровой гигиене", "мероприятие", "Москва", -18, 50, "photo", 120, users[0].id, "лектор, модератор"),
        ("Мастер-класс по безопасному паролю", "мастер-класс", "Казань", -14, 60, "high", 90, users[0].id, "ведущий, помощник"),
        ("Форум по цифровой грамотности", "мероприятие", "Екатеринбург", -12, 80, "high", 180, users[0].id, "лектор, куратор"),
        ("Фотоотчёт весеннего интенсива", "организационная помощь", "Самара", -9, 25, "photo", 32, users[0].id, "фотограф"),
        ("Оргпомощь на семейном фестивале", "организационная помощь", "Новосибирск", -6, 40, "base", 70, users[0].id, "волонтёр, координатор точки"),
        ("Лекция для родителей: фишинг", "мероприятие", -3, 55, "high", 110, users[0].id, "лектор"),
    ]
    events = []
    for idx, spec in enumerate(event_specs):
        if len(spec) == 9:
            title, event_type, city, delta, coins, quality, audience, organizer_id, required_roles = spec
        elif len(spec) == 8:
            title, event_type, city, delta, coins, quality, audience, organizer_id = spec
            required_roles = None
        else:
            title, event_type, delta, coins, quality, audience, organizer_id = spec
            city = "Москва"
            required_roles = None
        starts = now + timedelta(days=delta)
        event = Event(
            title=title,
            description=f"{title} — активность киберволонтёров Beeline.",
            event_type=event_type,
            city=city,
            starts_at=starts,
            ends_at=starts + timedelta(hours=2),
            status="completed",
            base_coins=coins,
            quality=quality,
            audience_size=audience,
            organizer_id=organizer_id,
            required_roles=required_roles,
        )
        events.append(event)

    planned_specs = [
        ("Выездной урок по кибербезопасности", "мероприятие", "Москва", 2, 60, "base", 100, "лектор, помощник"),
        ("Практикум по защите аккаунтов", "мастер-класс", "Казань", 5, 45, "photo", 30, "ведущий, помощник"),
        ("Оргпомощь на городском фестивале", "организационная помощь", "Новосибирск", 8, 35, "base", 50, "волонтёр, регистратор"),
        ("Лекция для младших школьников", "мероприятие", "Самара", 11, 65, "high", 130, "лектор"),
        ("Штабная встреча координаторов", "организационная помощь", "Екатеринбург", 15, 30, "base", 18, "координатор"),
        ("Мастер-класс по медиаграмотности", "мастер-класс", "Москва", 19, 55, "photo", 25, "ведущий, фотограф"),
    ]
    for title, event_type, city, delta, coins, quality, audience, required_roles in planned_specs:
        starts = now + timedelta(days=delta)
        events.append(Event(
            title=title,
            description=f"{title} — запланированное событие.",
            event_type=event_type,
            city=city,
            starts_at=starts,
            ends_at=starts + timedelta(hours=2),
            status="planned",
            base_coins=coins,
            quality=quality,
            audience_size=audience,
            organizer_id=users[0].id,
            required_roles=required_roles,
        ))
    db.add_all(events)
    db.commit()

    participation_map = {
        0: [(1, "active", 145), (3, "organizer", 190), (11, "participant", 120)],
        1: [(1, "participant", 135), (2, "active", 150), (4, "organizer", 210)],
        2: [(9, "organizer", 255), (10, "active", 170), (5, "participant", 140)],
        3: [(7, "active", 120), (8, "participant", 95)],
        4: [(5, "active", 115), (6, "participant", 90), (0, "organizer", 140)],
        5: [(3, "active", 165), (1, "participant", 140), (2, "participant", 120)],
    }
    for event_index, rows in participation_map.items():
        event = events[event_index]
        for user_idx, role, coins in rows:
            p = Participation(user_id=users[user_idx].id, event_id=event.id, role=role, status="completed", attendance_confirmed=True, coins_awarded=coins)
            db.add(p)
            users[user_idx].coins_balance += coins
            users[user_idx].last_activity_at = max(users[user_idx].last_activity_at, event.starts_at)
            db.add(CoinTransaction(user_id=users[user_idx].id, amount=coins, reason=f"Участие в {event.title}", meta=str(event.id)))

    # Planned participations
    for user_idx, event_idx, role in [(1, 6, "participant"), (2, 7, "participant"), (5, 8, "active"), (10, 9, "participant"), (3, 10, "organizer"), (7, 11, "participant")]:
        db.add(Participation(user_id=users[user_idx].id, event_id=events[event_idx].id, role=role, status="registered", attendance_confirmed=False, coins_awarded=0))

    from app.models.photo_report import PhotoReport
    db.add_all([
        PhotoReport(event_id=events[0].id, user_id=users[1].id, image_url="/uploads/demo_report_1.jpg", comment="Фотоотчёт с урока по цифровой гигиене"),
        PhotoReport(event_id=events[1].id, user_id=users[2].id, image_url="/uploads/demo_report_2.jpg", comment="Команда после мастер-класса по паролям"),
        PhotoReport(event_id=events[2].id, user_id=users[9].id, image_url="/uploads/demo_report_3.jpg", comment="Большой форум по цифровой грамотности"),
    ])

    ensure_default_achievements(db)
    db.commit()
