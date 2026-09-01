from app.schemas import Lesson, LessonStatus, Teacher, TeacherCategory

TEACHERS: list[Teacher] = [
    Teacher(id="t-dav", code="DAV", name="David Okafor", category=TeacherCategory.native, usdRate=22),
    Teacher(id="t-oli", code="OLI", name="Oliver Grant", category=TeacherCategory.native, usdRate=23.5),
    Teacher(id="t-mir", code="MIR", name="Mira Novak", category=TeacherCategory.non_native, usdRate=17.5),
    Teacher(id="t-leo", code="LEO", name="Leo Martins", category=TeacherCategory.non_native, usdRate=18),
    Teacher(id="t-tam", code="TAM", name="Tamara Reyes", category=TeacherCategory.esl, usdRate=16),
    Teacher(id="t-kat", code="KAT", name="Katya Orlova", category=TeacherCategory.esl, usdRate=15.5),
]


def _minutes(hhmm: str) -> int:
    hours, minutes = hhmm.split(":")
    return int(hours) * 60 + int(minutes)


LESSONS: list[Lesson] = [
    Lesson.model_validate(
        {
            "id": "ls-001",
            "date": "2026-08-31",
            "startMin": _minutes("7:50"),
            "endMin": _minutes("8:25"),
            "classGroupId": "fli-3c3",
            "roomId": "fli-06-108",
            "teacherId": "t-tam",
            "cmName": "Ms Hoa",
            "curriculum": "Family & Friends 3: U4 pp.30–31",
            "weekCode": "W12",
            "status": "scheduled",
        }
    ),
    Lesson.model_validate(
        {
            "id": "ls-004",
            "date": "2026-08-31",
            "startMin": _minutes("15:30"),
            "endMin": _minutes("16:15"),
            "classGroupId": "sy-sj3",
            "roomId": "sy-03-203",
            "teacherId": "t-kat",
            "curriculum": "Speaking: classroom objects",
            "status": "scheduled",
        }
    ),
    Lesson.model_validate(
        {
            "id": "ls-025",
            "date": "2026-09-02",
            "startMin": _minutes("19:10"),
            "endMin": _minutes("20:10"),
            "classGroupId": "ot-lp09a02a",
            "roomId": "ot-03-201",
            "teacherId": "t-mir",
            "cmName": "PTM",
            "curriculum": "Prepare 3: U12 pp.74–75",
            "weekCode": "W6D3",
            "status": LessonStatus.cancelled,
        }
    ),
    Lesson.model_validate(
        {
            "id": "ls-036",
            "date": "2026-09-04",
            "startMin": _minutes("15:30"),
            "endMin": _minutes("16:15"),
            "classGroupId": "sy-sj5",
            "roomId": "sy-03-203",
            "teacherId": "t-leo",
            "curriculum": "Project: my neighbourhood — presentations",
            "status": LessonStatus.no_show,
        }
    ),
    Lesson.model_validate(
        {
            "id": "ls-038",
            "date": "2026-09-04",
            "startMin": _minutes("17:30"),
            "endMin": _minutes("18:40"),
            "classGroupId": "ot-tn07b01c",
            "roomId": "ot-17-103",
            "teacherId": "t-mir",
            "cmName": "LVA",
            "curriculum": "Prepare 4: U11 Grammar — present perfect",
            "weekCode": "W6D4",
            "status": "scheduled",
            "movedFrom": {"date": "2026-09-03", "startMin": _minutes("17:30")},
        }
    ),
    Lesson.model_validate(
        {
            "id": "ls-009",
            "date": "2026-08-31",
            "startMin": _minutes("19:30"),
            "endMin": _minutes("21:00"),
            "classGroupId": "ld-il401",
            "roomId": "ld-07-401",
            "teacherId": "t-oli",
            "curriculum": "Writing Task 2: opinion essays — model + timed drill",
            "weekCode": "D7",
            "status": "scheduled",
        }
    ),
]
