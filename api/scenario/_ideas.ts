import { SCENARIO_IDEA_TRANSLATIONS, type ScenarioIdeaLocale } from "./_idea-translations";

export type ScenarioIdeaIntensity = "romantic" | "passion" | "hard";

export type ScenarioIdea = {
  id: string;
  intensity: ScenarioIdeaIntensity;
  en: string;
  ru: string;
};

/**
 * Original scenario seeds for Touché. The linked Intrigue, Mensby, and Vsexshop
 * articles informed broad premise families only; their wording is not reproduced.
 * Hard includes fictional dark-thriller, captivity, interrogation, and
 * force-play themes. These are story premises, not real-world instructions.
 * References: intrigue.dating/vse-o-sekse/rolevye-igry-v-sekse-50-jarkih-igr-v-sekse/;
 * mensby.com/sex/sexy/10257-idei-dlya-rolevykh-igr-v-sekse-51-vzroslaya-rolevaya-seks-igra;
 * vsexshop.ru/articles/1410-stsenarii-rolevyh-igr-chast-1.
 */
export const SCENARIO_IDEAS: readonly ScenarioIdea[] = [
  // ROMANTIC — curiosity, playful connection, and gentle closeness.
  { id: "rom-01-night-radio", intensity: "romantic", en: "A late-night radio host takes a call from a listener who recognizes the voice; trade small personal stories and end with a warm invitation.", ru: "Ночной радиоведущий принимает звонок от слушателя, который узнаёт его голос; обменяйтесь личными историями и завершите разговор тёплым приглашением." },
  { id: "rom-02-misplaced-postcard", intensity: "romantic", en: "A postcard reaches the wrong person, who replies with a playful clue; its sender comes by to discover who wrote back.", ru: "Открытка попадает не тому адресату, который отвечает игривой загадкой; автор приходит узнать, кто ему написал." },
  { id: "rom-03-lost-and-found", intensity: "romantic", en: "A lost-and-found attendant helps identify a keepsake, while its owner invents a charming story about where it came from.", ru: "Сотрудник бюро находок помогает опознать памятную вещь, а её владелец придумывает трогательную историю о её происхождении." },
  { id: "rom-04-antique-note", intensity: "romantic", en: "An antiques seller and a curious visitor discover a note behind an old frame and imagine who it was meant for.", ru: "Продавец антиквариата и любопытный посетитель находят записку за старой рамой и гадают, кому она предназначалась." },
  { id: "rom-05-garden-first-day", intensity: "romantic", en: "A patient garden keeper welcomes a first-time helper; choose a small patch together and give it a name only you know.", ru: "Заботливый садовник встречает новичка; выберите небольшой участок, посадите что-нибудь вместе и придумайте ему своё имя." },
  { id: "rom-06-rainy-entrance", intensity: "romantic", en: "Two adults shelter from rain beneath a narrow awning, share one umbrella, and trade guesses about each other's evening plans.", ru: "Двое взрослых пережидают дождь под небольшим навесом, делят один зонт и угадывают планы друг друга на вечер." },
  { id: "rom-07-last-screening", intensity: "romantic", en: "A private film-club host lets one guest choose the final short film; afterward, each shares the scene that stayed with them.", ru: "Хозяин домашнего киноклуба отдаёт последнему гостю выбор короткого фильма; после просмотра каждый называет запомнившийся кадр." },
  { id: "rom-08-record-shop", intensity: "romantic", en: "A record-shop owner asks a returning customer to choose a song for the closing hour, then listens to the story behind it.", ru: "Владелец магазина пластинок просит постоянного покупателя выбрать песню на закрытие, а затем слушает историю, связанную с ней." },
  { id: "rom-09-home-quiz", intensity: "romantic", en: "A playful quiz host offers a guest three questions about small joys; the guest gets to invent the final question in return.", ru: "Ведущий домашней викторины задаёт гостю три вопроса о маленьких радостях, а тот придумывает последний вопрос в ответ." },
  { id: "rom-10-pet-sitter", intensity: "romantic", en: "A pet sitter returns with a funny report and a drawing of the pet; its owner asks for one more story.", ru: "Зооняня возвращается с забавным отчётом и рисунком питомца; его хозяин просит рассказать ещё одну историю." },
  { id: "rom-11-archive-box", intensity: "romantic", en: "An archive volunteer and a visitor sort an old box of postcards, choosing one place they would like to see together.", ru: "Волонтёр архива и посетитель разбирают коробку старых открыток и выбирают место, куда хотели бы однажды поехать вместе." },
  { id: "rom-12-costume-repair", intensity: "romantic", en: "A costume-room assistant repairs a loose button for a performer; the performer turns the fitting into a playful compliment exchange.", ru: "Помощник костюмерной пришивает оторвавшуюся пуговицу исполнителю; примерка превращается в обмен игривыми комплиментами." },
  { id: "rom-13-ferry-ticket", intensity: "romantic", en: "A ferry clerk and a passenger discover they have the same destination in mind; plan an imaginary day there while waiting.", ru: "Кассир на пароме и пассажир выясняют, что мечтают об одном месте; пока ждут, придумывают совместный день там." },
  { id: "rom-14-keepsake-box", intensity: "romantic", en: "One partner opens a box of small keepsakes; the other chooses an object and asks for the memory attached to it.", ru: "Один партнёр открывает коробку памятных мелочей, другой выбирает предмет и просит рассказать связанную с ним историю." },
  { id: "rom-15-quiet-party", intensity: "romantic", en: "At a small private gathering, the host and last guest invent a two-person tradition before the evening ends.", ru: "На небольшой домашней встрече хозяин и последний гость придумывают традицию, которая будет только их двоих." },
  { id: "rom-16-night-bakery", intensity: "romantic", en: "A baker saves one imperfect pastry for a curious late visitor; together, give it a name and decide who gets the first bite.", ru: "Пекарь оставляет несовершенную булочку позднему гостю; вместе придумайте ей название и решите, кому достанется первый кусочек." },
  { id: "rom-17-radio-theatre", intensity: "romantic", en: "Two adults rehearse a tiny radio play at home, each choosing a voice and adding one unexpected line.", ru: "Двое взрослых репетируют дома короткую радиопостановку: каждый выбирает голос и добавляет неожиданную реплику." },
  { id: "rom-18-old-album", intensity: "romantic", en: "A collector shares an old travel album with a guest; choose one blank page and invent the picture it should hold.", ru: "Коллекционер показывает гостю старый альбом путешествий; выберите пустую страницу и придумайте, какая фотография там могла бы быть." },
  { id: "rom-19-projection-room", intensity: "romantic", en: "A cinema projectionist lets the final visitor pick a closing image; they describe what they think happens just afterward.", ru: "Киномеханик предлагает последнему зрителю выбрать финальный кадр; вместе представьте, что происходит с героями сразу после него." },
  { id: "rom-20-night-market", intensity: "romantic", en: "A night-market seller asks a visitor to help choose one small souvenir; the visitor picks something that reminds them of the seller.", ru: "Продавец вечернего рынка просит посетителя выбрать небольшой сувенир; тот находит вещь, которая напоминает ему о продавце." },
  { id: "rom-21-event-planner", intensity: "romantic", en: "An event planner and a last-minute helper prepare a quiet celebration; each secretly adds one detail the other will notice.", ru: "Организатор события и помощник в последний момент готовят тихий праздник; каждый добавляет деталь, которую заметит другой." },
  { id: "rom-22-festival-badge", intensity: "romantic", en: "Two adult festival volunteers swap badges for a short shift and discover they have been leaving each other cheerful notes.", ru: "Двое взрослых волонтёров фестиваля меняются бейджами на короткую смену и узнают, что давно оставляют друг другу записки." },
  { id: "rom-23-book-club", intensity: "romantic", en: "A book-club host and a late arrival choose one sentence from a novel and explain why it sounds like them.", ru: "Ведущий книжного клуба и опоздавший участник выбирают по одной фразе из романа и объясняют, почему она им близка." },
  { id: "rom-24-courier-letter", intensity: "romantic", en: "A courier brings a handwritten letter to the wrong door; its intended recipient arrives, and both trade a kind first impression.", ru: "Курьер приносит письмо не к той двери; настоящий адресат приходит, и они обмениваются первыми добрыми впечатлениями." },
  { id: "rom-25-boardgame-rematch", intensity: "romantic", en: "A board-game champion offers a rematch to a charming opponent, with the winner choosing a harmless, affectionate prize.", ru: "Чемпион настольных игр предлагает реванш симпатичному сопернику, а победитель выбирает невинный приз с нежным подтекстом." },
  { id: "rom-26-clockmaker", intensity: "romantic", en: "A clockmaker returns a repaired watch to its owner; they set it to a symbolic time and make a small wish.", ru: "Мастер возвращает хозяину починенные часы; они выставляют на них символичное время и загадывают небольшое желание." },
  { id: "rom-27-calligraphy", intensity: "romantic", en: "A calligraphy tutor asks an adult learner to write a word they rarely say aloud, then writes one in reply.", ru: "Наставник по каллиграфии просит взрослого ученика написать слово, которое тот редко произносит, и отвечает своим словом." },
  { id: "rom-28-costume-fair", intensity: "romantic", en: "Two adults at a historical costume fair choose fictional identities and invent how their characters first met.", ru: "Двое взрослых на исторической ярмарке выбирают вымышленные образы и придумывают, как их персонажи впервые встретились." },
  { id: "rom-29-window-display", intensity: "romantic", en: "A shop-window designer invites a passerby to help arrange a tiny display; each chooses an object that represents a private dream.", ru: "Оформитель витрины просит прохожего помочь с маленькой композицией; каждый выбирает предмет, который отражает его мечту." },
  { id: "rom-30-imaginary-city", intensity: "romantic", en: "A travel writer and a local guide invent a city that does not exist, then plan a private route for two.", ru: "Путевой автор и местный гид придумывают несуществующий город и составляют маршрут, который подходит только им двоим." },

  // PASSION — bolder flirting, costumes, and sensual escalation.
  { id: "pas-01-gynecologist", intensity: "passion", en: "A gynecologist and an adult woman patient play out a private appointment; the doctor begins formally, but she turns each clinical question into a teasing invitation and sets the pace.", ru: "Гинеколог и взрослая пациентка разыгрывают приём наедине: врач начинает деловым тоном, но она превращает каждый вопрос в дерзкий флирт и сама задаёт темп." },
  { id: "pas-02-urologist", intensity: "passion", en: "A urologist sees an adult male patient for a fictional consultation; the patient turns the formal questions into bold teasing and decides how the scene develops.", ru: "Уролог принимает взрослого пациента на вымышленном приёме; тот превращает деловые вопросы в дерзкий флирт и сам решает, как продолжится сцена." },
  { id: "pas-03-perfume-blend", intensity: "passion", en: "A perfumer offers an adult client a private scent consultation; each chooses a note that reminds them of the other.", ru: "Парфюмер проводит для взрослого клиента личную консультацию; каждый выбирает ноту, которая напоминает ему о другом." },
  { id: "pas-04-tailor-fitting", intensity: "passion", en: "A tailor makes a last-minute adjustment to an outfit; the client asks for a slower fitting and chooses what to reveal next.", ru: "Портной в последний момент подгоняет наряд; клиент просит не торопиться и сам выбирает, что показать следующим." },
  { id: "pas-05-soundcheck", intensity: "passion", en: "A sound engineer helps an adult singer prepare for a private performance, adjusting the microphone while the singer tests a teasing lyric.", ru: "Звукорежиссёр помогает взрослому певцу подготовиться к закрытому выступлению; тот проверяет микрофон и пробует кокетливую строчку." },
  { id: "pas-06-backstage-dresser", intensity: "passion", en: "A backstage dresser helps an adult performer change between acts; the performer turns each costume adjustment into a flirtatious challenge.", ru: "Костюмер за кулисами помогает взрослому артисту сменить образ; тот превращает каждую поправку костюма в флирт." },
  { id: "pas-07-private-card-table", intensity: "passion", en: "A private game host and a confident guest raise the stakes with playful dares, trading control of the next move.", ru: "Ведущий закрытой игры и уверенный гость повышают ставки игривыми заданиями и по очереди выбирают следующий ход." },
  { id: "pas-08-night-concierge", intensity: "passion", en: "A night concierge offers an adult guest a discreet room upgrade; the guest asks what other private luxuries are available.", ru: "Ночной консьерж предлагает взрослому гостю тихий номер получше; тот интересуется, какие ещё приватные удовольствия доступны." },
  { id: "pas-09-tattoo-sketch", intensity: "passion", en: "A tattoo artist sketches a symbolic design for an adult client; they choose where it would sit and linger over the meaning.", ru: "Тату-мастер набрасывает для взрослого клиента символичный рисунок; вместе они выбирают место и задерживаются на его смысле." },
  { id: "pas-10-private-audio-demo", intensity: "passion", en: "An audio technician demonstrates a new sound system to its owner; a favorite song turns the technical visit into a close dance.", ru: "Аудиотехник показывает хозяину домашнюю систему звука; любимая песня превращает технический визит в близкий танец." },
  { id: "pas-11-after-game-referee", intensity: "passion", en: "After a private practice match, an adult referee and athlete debate one playful rule, then demonstrate it at close range.", ru: "После закрытой тренировки взрослый судья и спортсмен спорят об одном игровом правиле, а затем проверяют его вблизи." },
  { id: "pas-12-closed-bar", intensity: "passion", en: "A bartender is closing a private lounge when a familiar guest asks for one last drink and one honest answer.", ru: "Бармен закрывает приватный зал, когда знакомый гость просит последний напиток и один честный ответ." },
  { id: "pas-13-tarot-reading", intensity: "passion", en: "A tarot reader gives an adult client a playful two-card reading; the client asks the reader to become part of the prediction.", ru: "Таролог делает взрослому клиенту игривый расклад из двух карт; тот просит включить самого таролога в предсказание." },
  { id: "pas-14-hair-stylist", intensity: "passion", en: "A stylist offers an adult client a daring new look; the client asks for a private reveal and a closer opinion.", ru: "Стилист предлагает взрослому клиенту смелый новый образ; тот просит показать результат наедине и высказать мнение поближе." },
  { id: "pas-15-language-interpreter", intensity: "passion", en: "An interpreter helps an adult visitor rehearse a bold phrase for an event, then asks to hear it without translation.", ru: "Переводчик помогает взрослому гостю отрепетировать смелую фразу для вечера, а затем просит повторить её без перевода." },
  { id: "pas-16-escape-room-host", intensity: "passion", en: "A private escape-room host gives two adult players one final clue; solving it requires them to work very close together.", ru: "Ведущий закрытого квеста даёт двум взрослым игрокам последнюю подсказку; решить её можно только действуя совсем рядом." },
  { id: "pas-17-acting-coach", intensity: "passion", en: "An acting coach helps an adult performer rehearse a charged reunion scene, asking them to make the final line more personal.", ru: "Педагог по актёрскому мастерству помогает взрослому артисту репетировать сцену встречи и просит сделать последнюю реплику личнее." },
  { id: "pas-18-private-chef", intensity: "passion", en: "A private chef serves an adult guest a tasting menu; the guest chooses which course deserves a slower, more intimate explanation.", ru: "Личный повар подаёт взрослому гостю дегустационное меню; тот выбирает блюдо, которое хочется обсудить медленнее и ближе." },
  { id: "pas-19-private-coach", intensity: "passion", en: "A private sports coach teaches an adult client one difficult move, then lets the client decide how close the demonstration gets.", ru: "Персональный тренер показывает взрослому клиенту сложное движение и позволяет ему самому выбрать, насколько близко будет демонстрация." },
  { id: "pas-20-night-flight", intensity: "passion", en: "On a fictional overnight flight, a flight attendant and adult passenger share a quiet conversation after the cabin settles.", ru: "В вымышленном ночном рейсе стюард и взрослый пассажир остаются вдвоём для тихого разговора после отбоя." },
  { id: "pas-21-agent-and-artist", intensity: "passion", en: "An adult artist's agent negotiates one last change to a private appearance; the artist counters with a more personal request.", ru: "Агент взрослого артиста обсуждает последнее изменение закрытого выступления; артист отвечает личной просьбой." },
  { id: "pas-22-studio-voiceover", intensity: "passion", en: "A voice director asks an adult actor to reread a romantic line with less distance; the actor asks the director to model it.", ru: "Режиссёр озвучания просит взрослого актёра прочитать романтическую фразу ближе; актёр предлагает показать пример." },
  { id: "pas-23-private-wardrobe", intensity: "passion", en: "A wardrobe stylist prepares an adult guest for a private event; the guest chooses one daring detail for the stylist to fasten.", ru: "Стилист готовит взрослого гостя к закрытому вечеру; тот выбирает смелую деталь, которую просит застегнуть." },
  { id: "pas-24-home-astronomer", intensity: "passion", en: "An amateur astronomer invites an adult guest to use a small telescope at home; they take turns choosing what to look for.", ru: "Астроном-любитель приглашает взрослого гостя посмотреть в домашний телескоп; они по очереди выбирают, что искать." },
  { id: "pas-25-private-gallery-critic", intensity: "passion", en: "A gallery critic and an adult artist review one unfinished work in private; the artist asks for a more daring interpretation.", ru: "Критик и взрослый художник наедине обсуждают незаконченную работу; художник просит дать более смелую трактовку." },
  { id: "pas-26-bike-mechanic", intensity: "passion", en: "A bicycle mechanic finishes a fictional repair at home; the owner offers a private demonstration ride around the room.", ru: "Веломеханик заканчивает вымышленный ремонт дома; хозяин велосипеда предлагает устроить короткую пробную поездку прямо в комнате." },
  { id: "pas-27-event-headliner", intensity: "passion", en: "A private-event planner and an adult headliner make a last-minute deal: one extra rehearsal in exchange for a personal promise.", ru: "Организатор закрытого вечера и взрослый хедлайнер договариваются о дополнительной репетиции в обмен на личное обещание." },
  { id: "pas-28-understudy", intensity: "passion", en: "An adult understudy steps into a private rehearsal opposite the lead performer; the scene calls for one unexpectedly intimate pause.", ru: "Взрослый дублёр выходит на закрытую репетицию с ведущим артистом; по сцене им предстоит неожиданно близкая пауза." },
  { id: "pas-29-private-aquarium", intensity: "passion", en: "A night guide gives an adult guest a private tour of an empty aquarium, pausing at the tank they both choose.", ru: "Ночной гид проводит взрослому гостю экскурсию по пустому океанариуму и задерживается у выбранного ими аквариума." },
  { id: "pas-30-vintage-tailoring", intensity: "passion", en: "A vintage-clothing buyer and an adult seller negotiate over one unusual jacket, each revealing why they want the other to keep it.", ru: "Покупатель винтажной одежды и взрослый продавец спорят из-за необычного пиджака и объясняют, почему хотят оставить его другому." },

  // HARD — bold adult play, including dark thriller and force-play fantasies.
  { id: "hard-01-fictional-audition", intensity: "hard", en: "An adult performer attends a fictional private screen test with a confident director; the performer chooses the daring pose and leads the intimate turn. Nothing is recorded.", ru: "Взрослый артист приходит на вымышленную закрытую пробу; уверенный режиссёр предлагает выбор, а артист сам задаёт смелый поворот сцены. Ничего не записывают." },
  { id: "hard-02-private-dancer", intensity: "hard", en: "An adult private dancer gives a bold performance for a guest, then invites the guest to choose the final song and next move.", ru: "Взрослый танцор выступает для гостя наедине, затем предлагает выбрать последнюю песню и следующий шаг." },
  { id: "hard-03-escort-appointment", intensity: "hard", en: "An adult escort meets a returning client for a fictional appointment; the escort sets the tone, and both shape the scene through direct requests.", ru: "Взрослый эскорт встречается с постоянным клиентом в вымышленной сцене; эскорт задаёт тон, а оба прямо выбирают продолжение." },
  { id: "hard-04-masked-captor", intensity: "hard", en: "In a fictional capture fantasy, a masked captor corners an adult rival in a hideout; the captive resists in character, then makes a bold counteroffer.", ru: "В вымышленной сцене захвата человек в маске загоняет взрослого соперника в укрытие; пленник сопротивляется по роли, а затем делает дерзкое встречное предложение." },
  { id: "hard-05-queen-courtier", intensity: "hard", en: "An adult queen invites a witty courtier to earn a private favor through bold compliments and a challenge the courtier designs.", ru: "Взрослая королева предлагает остроумному придворному заслужить личную милость дерзкими комплиментами и испытанием, которое он сам придумает." },
  { id: "hard-06-interrogator-spy", intensity: "hard", en: "An interrogator questions an adult spy in a fictional safehouse, pressing for a secret; the captured agent answers with defiant, teasing challenges.", ru: "Допрашивающий требует тайну у взрослого шпиона в вымышленном убежище; пойманный агент дерзит, торгуется и отвечает провокацией." },
  { id: "hard-07-art-heist", intensity: "hard", en: "Two adult rivals stage a fictional art-heist in a private room; one guards the prize while the other negotiates a very personal trade.", ru: "Двое взрослых соперников разыгрывают вымышленное похищение картины дома; один охраняет приз, другой предлагает очень личный обмен." },
  { id: "hard-08-prisoner-warden", intensity: "hard", en: "A strict warden and a defiant adult prisoner stage a tense private scene; the prisoner challenges each order and turns the sentence into a daring bargain.", ru: "Суровый надзиратель и дерзкий взрослый заключённый разыгрывают напряжённую сцену; заключённый спорит с каждым приказом и превращает наказание в дерзкую сделку." },
  { id: "hard-09-blackmail-game", intensity: "hard", en: "A blackmailer demands a secret from an adult rival at a fictional late-night meeting; the rival turns the threat into a provocative wager.", ru: "Шантажист требует тайну у взрослого соперника на вымышленной ночной встрече; тот превращает угрозу в провокационное пари." },
  { id: "hard-10-pirate-first-mate", intensity: "hard", en: "An adult pirate captain and a bold first mate dispute a treasure map; the mate proposes a private wager to settle who leads.", ru: "Взрослый капитан-пират и дерзкий старпом спорят из-за карты сокровищ; старпом предлагает личное пари, чтобы решить, кто поведёт дальше." },
  { id: "hard-11-race-pit-stop", intensity: "hard", en: "A fictional race driver returns to the private garage after a win; the mechanic demands a celebratory ritual of their own design.", ru: "Гонщик возвращается в домашний гараж после вымышленной победы; механик требует устроить праздник по его правилам." },
  { id: "hard-12-star-and-guard", intensity: "hard", en: "An adult celebrity and a private bodyguard negotiate one last hour away from the crowd; the celebrity chooses how the guard earns trust.", ru: "Взрослая знаменитость и телохранитель договариваются о часе без публики; знаменитость сама решает, как телохранителю заслужить доверие." },
  { id: "hard-13-backstage-star", intensity: "hard", en: "An adult pop star asks a backstage manager to stay after the show; the manager answers with a bold condition of their own.", ru: "Взрослая поп-звезда просит менеджера задержаться после шоу; тот отвечает собственным смелым условием." },
  { id: "hard-14-studio-director", intensity: "hard", en: "Two adult performers rehearse a fictional erotic-film scene without cameras; they trade director and star roles and choose the final beat together.", ru: "Двое взрослых артистов репетируют вымышленную эротическую сцену без камер; они меняются ролями режиссёра и звезды и вместе выбирают финальный ход." },
  { id: "hard-15-staged-wrestling", intensity: "hard", en: "Two adult wrestling performers plan a theatrical private rematch; they choreograph a dramatic entrance and let the winner choose the after-show scene.", ru: "Двое взрослых рестлеров готовят театральный реванш наедине; придумывают эффектный выход, а победитель выбирает сцену после шоу." },
  { id: "hard-16-private-photo-session", intensity: "hard", en: "Two adults stage a fictional erotic editorial with no pictures taken; the model chooses the poses and turns the camera away for a closer scene.", ru: "Двое взрослых разыгрывают закрытую эротическую фотосессию без съёмки; модель выбирает позы, а затем откладывает камеру и задаёт близкий тон." },
  { id: "hard-17-gala-lockdown", intensity: "hard", en: "During a fictional lockdown at a gala, an adult VIP and bodyguard trade sharp orders and staged defiance as a dramatic threat closes in.", ru: "Во время вымышленной тревоги на приёме взрослый VIP и телохранитель обмениваются резкими приказами и игровым сопротивлением, пока опасность приближается." },
  { id: "hard-18-club-headliner", intensity: "hard", en: "An adult club headliner invites a guest backstage for a private encore; the guest picks the opening move and the performer sets the pace.", ru: "Взрослый хедлайнер приглашает гостя за кулисы на приватный бис; гость выбирает первый ход, артист задаёт темп." },
  { id: "hard-19-housekeeper-visit", intensity: "hard", en: "An adult housekeeper arrives for a fictional private appointment; the homeowner turns the checklist into a daring game with rules they both invent.", ru: "Взрослый домработник приходит на вымышленный личный визит; хозяин превращает список дел в дерзкую игру с правилами для двоих." },
  { id: "hard-20-card-dealer", intensity: "hard", en: "A private-card dealer and an adult player invent a high-stakes final hand; each bets one personal privilege and negotiates the terms.", ru: "Дилер закрытой карточной игры и взрослый игрок придумывают решающую раздачу; каждый ставит на кон личную привилегию и оговаривает условия." },
  { id: "hard-21-masked-host", intensity: "hard", en: "At a private masked gathering, an adult host challenges a guest to guess their identity through three flirtatious clues.", ru: "На закрытой встрече в масках взрослый хозяин предлагает гостю угадать его личность по трём дерзким подсказкам." },
  { id: "hard-22-stage-magician", intensity: "hard", en: "An adult magician and an assistant rehearse a private illusion; the assistant changes the script and makes the magician follow their lead.", ru: "Взрослый фокусник и ассистент репетируют трюк наедине; ассистент меняет сценарий и заставляет фокусника следовать его замыслу." },
  { id: "hard-23-detective-suspect", intensity: "hard", en: "An adult detective stages a private interrogation of a suspected thief; the suspect gives one sharp confession, then dares the detective to make the verdict personal.", ru: "Взрослый детектив устраивает допрос предполагаемого похитителя; тот признаётся в одной дерзкой детали и предлагает вынести личный приговор." },
  { id: "hard-24-boss-informant", intensity: "hard", en: "A crime boss finds an adult informant in a fictional hideout; the captured rival bargains for release while the boss names a provocative price.", ru: "Главарь банды обнаруживает взрослого осведомителя в вымышленном убежище; пойманный соперник торгуется за свободу, а главарь назначает провокационную цену." },
  { id: "hard-25-private-choreographer", intensity: "hard", en: "An adult choreographer and lead dancer rehearse a bold finale alone; the dancer refuses the planned ending and creates a closer one.", ru: "Взрослый хореограф и ведущий танцор репетируют смелый финал наедине; танцор меняет задумку и предлагает более близкое завершение." },
  { id: "hard-26-royal-decree", intensity: "hard", en: "Two adult courtiers play rival claimants to a fictional throne; each tries to win the other's allegiance with a private bargain.", ru: "Двое взрослых придворных разыгрывают соперников за вымышленный трон; каждый завоёвывает союзника личной дерзкой сделкой." },
  { id: "hard-27-hostage-rescue", intensity: "hard", en: "A stunt director and adult performer rehearse a fictional hostage-rescue finale; the captor holds the scene's secret while the captive plots a bold escape.", ru: "Режиссёр трюков и взрослый артист репетируют вымышленное спасение заложника; похититель хранит тайну сцены, а пленник готовит дерзкий побег." },
  { id: "hard-28-private-hostess", intensity: "hard", en: "An adult private-event host offers a guest an exclusive after-hours experience; the guest names one daring request and one playful boundary.", ru: "Взрослый ведущий закрытого вечера предлагает гостю особое продолжение; тот называет одно смелое желание и одну игровую границу." },
  { id: "hard-29-rival-performers", intensity: "hard", en: "Two adult performers compete for the final spotlight in a private club; the loser chooses how the winner celebrates.", ru: "Двое взрослых артистов борются за последний выход в закрытом клубе; проигравший выбирает, как победитель отметит успех." },
  { id: "hard-30-private-command-game", intensity: "hard", en: "Two adult partners invent a short command game where each leads one round and the other may change one rule.", ru: "Двое взрослых партнёров придумывают короткую игру с командами: каждый ведёт по раунду, а второй может изменить одно правило." },
];

export function scenarioIdeaTag(idea: ScenarioIdea): string {
  return `hook:${idea.id}`;
}

export function selectScenarioIdea(
  intensity: ScenarioIdeaIntensity,
  signals: { recent: string[]; avoid: string[] },
): ScenarioIdea {
  const candidates = SCENARIO_IDEAS.filter((idea) => idea.intensity === intensity);
  const recent = new Set(signals.recent);
  const avoid = new Set(signals.avoid);
  const fresh = candidates.filter((idea) => {
    const tag = scenarioIdeaTag(idea);
    return !recent.has(tag) && !avoid.has(tag);
  });
  const notAvoided = candidates.filter((idea) => !avoid.has(scenarioIdeaTag(idea)));
  const pool = fresh.length ? fresh : notAvoided.length ? notAvoided : candidates;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function scenarioIdeaContext(
  lang: string,
  idea: ScenarioIdea,
): string {
  const translated = SCENARIO_IDEA_TRANSLATIONS[idea.id];
  const premise = lang === "ru"
    ? idea.ru
    : lang === "en"
      ? idea.en
      : lang === "hi" || lang === "pt" || lang === "es"
        ? translated?.[lang as ScenarioIdeaLocale]
        : undefined;
  if (!premise) throw new Error(`Missing ${lang} scenario premise for ${idea.id}`);
  const outputLanguage: Record<string, string> = {
    ru: "Russian",
    en: "English",
    hi: "Hindi in Devanagari",
    pt: "Brazilian Portuguese",
    es: "Spanish",
  };
  const language = outputLanguage[lang];
  if (!language) throw new Error(`Unsupported scenario language: ${lang}`);
  return lang === "ru"
    ? `Завязка для этой сцены (идея оригинальная; не копируй её фразы дословно): ${premise}\nНапиши название и обе карточки полностью по-русски. Сохрани выбранный уровень и роли; покажи взаимное развитие сцены, не раскрывая план другой карточки.`
    : `Selected original scene seed (do not copy its wording): ${premise}\nWrite the title and both cards fully in ${language}. Keep the requested intensity and roles; let both parts of the scene progress while keeping each partner's private plan hidden.`;
}
