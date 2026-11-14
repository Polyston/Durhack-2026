"""The response parser must survive messy model output."""

from sentinel.types import Rule, Severity
from sentinel.vision import MockVision, build_prompt, parse_response


def rules():
    return [Rule("a", "rule a", Severity.WARN), Rule("b", "rule b", Severity.ALARM)]


def test_parses_clean_json():
    text = '{"scene":"a bench","results":[{"id":"a","triggered":true,"confidence":0.8,"reason":"saw it"},{"id":"b","triggered":false,"confidence":0.1,"reason":""}]}'
    fv = parse_response(text, rules())
    assert fv.scene == "a bench"
    assert fv.by_rule("a").triggered and fv.by_rule("a").confidence == 0.8
    assert not fv.by_rule("b").triggered


def test_parses_json_in_code_fence():
    text = "```json\n{\"results\":[{\"id\":\"a\",\"triggered\":true,\"confidence\":0.9}]}\n```"
    fv = parse_response(text, rules())
    assert fv.error is None
    assert fv.by_rule("a").triggered
    assert fv.by_rule("b").triggered is False  # missing rule defaults to not-triggered


def test_missing_rule_filled_in():
    fv = parse_response('{"results":[]}', rules())
    assert len(fv.verdicts) == 2
    assert all(v.triggered is False for v in fv.verdicts)


def test_garbage_is_an_error_not_a_crash():
    fv = parse_response("I cannot help with that.", rules())
    assert fv.error is not None


def test_confidence_clamped():
    fv = parse_response('{"results":[{"id":"a","triggered":true,"confidence":5}]}', rules())
    assert fv.by_rule("a").confidence == 1.0


def test_prompt_lists_every_rule():
    prompt = build_prompt(rules())
    assert "rule a" in prompt and "rule b" in prompt


def test_mock_vision_runs_a_script():
    rs = rules()
    mv = MockVision(rs, script=[set(), {"a"}, {"b"}])
    assert mv.analyse(b"", rs).by_rule("a").triggered is False
    assert mv.analyse(b"", rs).by_rule("a").triggered is True
    assert mv.analyse(b"", rs).by_rule("b").triggered is True
