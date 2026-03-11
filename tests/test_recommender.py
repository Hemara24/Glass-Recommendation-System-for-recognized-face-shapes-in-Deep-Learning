"""Tests for the age-aware glass recommendation system."""

import pytest

from recommender import (
    GlassRecommendation,
    classify_age_group,
    recommend_glasses,
)


# ---------------------------------------------------------------------------
# classify_age_group
# ---------------------------------------------------------------------------


class TestClassifyAgeGroup:
    def test_child_boundaries(self):
        assert classify_age_group(0) == "child"
        assert classify_age_group(12) == "child"

    def test_teen_boundaries(self):
        assert classify_age_group(13) == "teen"
        assert classify_age_group(17) == "teen"

    def test_young_adult_boundaries(self):
        assert classify_age_group(18) == "young_adult"
        assert classify_age_group(35) == "young_adult"

    def test_adult_boundaries(self):
        assert classify_age_group(36) == "adult"
        assert classify_age_group(59) == "adult"

    def test_senior_boundaries(self):
        assert classify_age_group(60) == "senior"
        assert classify_age_group(90) == "senior"

    def test_negative_age_raises(self):
        with pytest.raises(ValueError, match="non-negative"):
            classify_age_group(-1)


# ---------------------------------------------------------------------------
# recommend_glasses – basic validation
# ---------------------------------------------------------------------------


class TestRecommendGlassesReturnType:
    def test_returns_glass_recommendation(self):
        result = recommend_glasses("oval", 25)
        assert isinstance(result, GlassRecommendation)

    def test_face_shape_stored(self):
        result = recommend_glasses("Round", 25)
        assert result.face_shape == "round"

    def test_age_and_group_stored(self):
        result = recommend_glasses("oval", 8)
        assert result.age == 8
        assert result.age_group == "child"

    def test_unknown_face_shape_raises(self):
        with pytest.raises(ValueError, match="Unknown face shape"):
            recommend_glasses("hexagon", 30)

    def test_invalid_age_raises(self):
        with pytest.raises(ValueError):
            recommend_glasses("oval", -5)


# ---------------------------------------------------------------------------
# Age-specific frame recommendations
# ---------------------------------------------------------------------------


class TestChildRecommendations:
    """Children (0-12) need small, lightweight, durable frames."""

    def test_includes_flexible_frames_feature(self):
        rec = recommend_glasses("oval", 7)
        assert any("flexible" in f for f in rec.preferred_features)

    def test_avoids_rimless_for_children(self):
        rec = recommend_glasses("square", 10)
        assert "rimless" not in rec.recommended_frames

    def test_lens_includes_polycarbonate(self):
        rec = recommend_glasses("round", 5)
        assert any("polycarbonate" in l for l in rec.lens_suggestions)

    def test_fit_notes_mention_lightweight(self):
        rec = recommend_glasses("oval", 9)
        assert "lightweight" in rec.fit_notes.lower()


class TestSeniorRecommendations:
    """Seniors (60+) need progressive-lens ready, wide, lightweight frames."""

    def test_includes_progressive_lens_feature(self):
        rec = recommend_glasses("oval", 65)
        assert any("progressive" in f for f in rec.preferred_features)

    def test_avoids_small_frames(self):
        rec = recommend_glasses("round", 72)
        assert "very small frames" in rec.frames_to_avoid

    def test_lens_suggestions_include_progressive(self):
        rec = recommend_glasses("square", 80)
        assert any("progressive" in l for l in rec.lens_suggestions)

    def test_fit_notes_mention_spring_hinges(self):
        rec = recommend_glasses("heart", 68)
        assert "spring hinges" in rec.fit_notes.lower()


class TestAdultRecommendations:
    """Adults (36-59) should be recommended progressive-lens ready frames."""

    def test_preferred_features_include_progressive(self):
        rec = recommend_glasses("oval", 45)
        assert any("progressive" in f for f in rec.preferred_features)

    def test_lens_suggestions_include_blue_light(self):
        rec = recommend_glasses("round", 50)
        assert any("blue-light" in l for l in rec.lens_suggestions)


class TestYoungAdultRecommendations:
    """Young adults (18-35) should get trendy, fashion-forward options."""

    def test_preferred_features_include_bold_colors(self):
        rec = recommend_glasses("oval", 22)
        assert any("bold" in f or "fashion" in f for f in rec.preferred_features)

    def test_lens_suggestions_include_blue_light_filter(self):
        rec = recommend_glasses("round", 28)
        assert any("blue-light" in l for l in rec.lens_suggestions)


# ---------------------------------------------------------------------------
# Age gap: the same face shape gives different recommendations across ages
# ---------------------------------------------------------------------------


class TestAgeGapDifferentiation:
    """The core fix: different ages must produce different recommendations."""

    def test_child_and_senior_differ(self):
        child_rec = recommend_glasses("oval", 8)
        senior_rec = recommend_glasses("oval", 70)
        assert child_rec.preferred_features != senior_rec.preferred_features
        assert child_rec.fit_notes != senior_rec.fit_notes

    def test_child_and_adult_lens_differ(self):
        child_rec = recommend_glasses("round", 10)
        adult_rec = recommend_glasses("round", 45)
        assert child_rec.lens_suggestions != adult_rec.lens_suggestions

    def test_all_age_groups_produce_valid_recommendations(self):
        representative_ages = {
            "child": 8,
            "teen": 15,
            "young_adult": 25,
            "adult": 45,
            "senior": 70,
        }
        for group, age in representative_ages.items():
            rec = recommend_glasses("oval", age)
            assert rec.age_group == group
            assert len(rec.recommended_frames) > 0


# ---------------------------------------------------------------------------
# Summary output
# ---------------------------------------------------------------------------


class TestSummaryOutput:
    def test_summary_contains_face_shape(self):
        rec = recommend_glasses("oval", 30)
        assert "oval" in rec.summary()

    def test_summary_contains_age_group(self):
        rec = recommend_glasses("square", 70)
        assert "senior" in rec.summary()

    def test_summary_contains_fit_notes(self):
        rec = recommend_glasses("round", 8)
        assert rec.fit_notes in rec.summary()
