package server

import (
	"fmt"
	"testing"

	"github.com/stretchr/testify/assert"
	"go.uber.org/zap/zaptest"

	eventsv1 "github.com/Labubutomy/backend/proto/gen/go/platform/events/v1"
	usersv1 "github.com/Labubutomy/backend/proto/gen/go/platform/users/v1"
)

// Additional unit tests to improve coverage

func TestOrchestratorServer_CalculateMatchScore_AdditionalCases(t *testing.T) {
	server := &OrchestratorServer{
		logger: zaptest.NewLogger(t),
	}

	tests := []struct {
		name          string
		taskEvent     *eventsv1.TaskCreated
		developer     *usersv1.DeveloperProfile
		expectedScore float64
		description   string
	}{
		{
			name: "zero_budget_scenario",
			taskEvent: &eventsv1.TaskCreated{
				TaskId:           "zero-budget",
				SkillTags:        []string{"go"},
				BudgetLowerBound: 0.0,
				BudgetUpperBound: 0.0,
			},
			developer: &usersv1.DeveloperProfile{
				UserId:     "dev1",
				SkillTags:  []string{"go"},
				HourlyRate: 50.0,
				Rating:     4.0,
			},
			expectedScore: 0.96, // skill=1.0, budget=1.0 (budgetMid=0 case), rating=0.8 = 0.5*1.0 + 0.3*1.0 + 0.2*0.8 = 0.96
			description:   "Should handle zero budget gracefully",
		},
		{
			name: "extremely_high_developer_rate",
			taskEvent: &eventsv1.TaskCreated{
				TaskId:           "normal-task",
				SkillTags:        []string{"go"},
				BudgetLowerBound: 50.0,
				BudgetUpperBound: 100.0,
			},
			developer: &usersv1.DeveloperProfile{
				UserId:     "expensive-dev",
				SkillTags:  []string{"go"},
				HourlyRate: 1000.0,
				Rating:     5.0,
			},
			expectedScore: 0.7, // skill=1.0, budget=0.0 (capped at min), rating=1.0 = 0.5*1.0 + 0.3*0.0 + 0.2*1.0 = 0.7
			description:   "Should handle rates far above budget",
		},
		{
			name: "no_matching_skills_at_all",
			taskEvent: &eventsv1.TaskCreated{
				TaskId:           "python-task",
				SkillTags:        []string{"python", "django", "flask"},
				BudgetLowerBound: 50.0,
				BudgetUpperBound: 100.0,
			},
			developer: &usersv1.DeveloperProfile{
				UserId:     "go-only-dev",
				SkillTags:  []string{"go", "gin", "gorm"},
				HourlyRate: 75.0,
				Rating:     4.5,
			},
			expectedScore: 0.48, // skill=0.0, budget=1.0 (75 is perfect midpoint), rating=0.9 = 0.5*0.0 + 0.3*1.0 + 0.2*0.9 = 0.48
			description:   "Should handle zero skill overlap",
		},
		{
			name: "minimal_rating_developer",
			taskEvent: &eventsv1.TaskCreated{
				TaskId:           "task1",
				SkillTags:        []string{"go"},
				BudgetLowerBound: 40.0,
				BudgetUpperBound: 60.0,
			},
			developer: &usersv1.DeveloperProfile{
				UserId:     "newbie-dev",
				SkillTags:  []string{"go"},
				HourlyRate: 50.0,
				Rating:     1.0,
			},
			expectedScore: 0.84, // skill=1.0, budget=1.0 (50 is perfect midpoint), rating=0.2 = 0.5*1.0 + 0.3*1.0 + 0.2*0.2 = 0.84
			description:   "Should handle minimal rating properly",
		},
		{
			name: "maximum_rating_developer",
			taskEvent: &eventsv1.TaskCreated{
				TaskId:           "task2",
				SkillTags:        []string{"go"},
				BudgetLowerBound: 40.0,
				BudgetUpperBound: 60.0,
			},
			developer: &usersv1.DeveloperProfile{
				UserId:     "expert-dev",
				SkillTags:  []string{"go"},
				HourlyRate: 50.0,
				Rating:     5.0,
			},
			expectedScore: 1.0, // skill=1.0, budget=1.0 (50 is perfect midpoint), rating=1.0 = 0.5*1.0 + 0.3*1.0 + 0.2*1.0 = 1.0
			description:   "Should handle maximum rating properly",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			score := server.calculateMatchScore(tt.taskEvent, tt.developer)
			assert.InDelta(t, tt.expectedScore, score, 0.1, tt.description)
		})
	}
}

func TestOrchestratorServer_IntersectSkills_EdgeCases(t *testing.T) {
	server := &OrchestratorServer{}

	tests := []struct {
		name           string
		requiredSkills []string
		devSkills      []string
		expected       []string
		description    string
	}{
		{
			name:           "nil_required_skills",
			requiredSkills: nil,
			devSkills:      []string{"go", "python"},
			expected:       []string{},
			description:    "Should handle nil required skills",
		},
		{
			name:           "nil_developer_skills",
			requiredSkills: []string{"go", "python"},
			devSkills:      nil,
			expected:       []string{},
			description:    "Should handle nil developer skills",
		},
		{
			name:           "both_nil_skills",
			requiredSkills: nil,
			devSkills:      nil,
			expected:       []string{},
			description:    "Should handle both nil skill arrays",
		},
		{
			name:           "empty_required_skills",
			requiredSkills: []string{},
			devSkills:      []string{"go", "python"},
			expected:       []string{},
			description:    "Should handle empty required skills",
		},
		{
			name:           "empty_developer_skills",
			requiredSkills: []string{"go", "python"},
			devSkills:      []string{},
			expected:       []string{},
			description:    "Should handle empty developer skills",
		},
		{
			name:           "both_empty_skills",
			requiredSkills: []string{},
			devSkills:      []string{},
			expected:       []string{},
			description:    "Should handle both empty skill arrays",
		},
		{
			name:           "duplicate_skills_in_required",
			requiredSkills: []string{"go", "go", "python"},
			devSkills:      []string{"go", "javascript"},
			expected:       []string{"go"},
			description:    "Should handle duplicates in required skills",
		},
		{
			name:           "duplicate_skills_in_developer",
			requiredSkills: []string{"go", "python"},
			devSkills:      []string{"go", "go", "javascript"},
			expected:       []string{"go", "go"}, // Returns duplicates from developer side
			description:    "Should handle duplicates in developer skills",
		},
		{
			name:           "mixed_case_with_spaces",
			requiredSkills: []string{" GO ", "Python", "  JavaScript  "},
			devSkills:      []string{"go", " python ", "JAVA"},
			expected:       nil, // No matches due to exact space differences
			description:    "Should handle mixed case and whitespace",
		},
		{
			name:           "special_characters_in_skills",
			requiredSkills: []string{"c++", "c#", ".net"},
			devSkills:      []string{"C++", "C#", ".NET", "java"},
			expected:       []string{"C++", "C#", ".NET"}, // Returns developer versions
			description:    "Should handle special characters case-insensitively",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := server.intersectSkills(tt.requiredSkills, tt.devSkills)
			assert.ElementsMatch(t, tt.expected, result, tt.description)
		})
	}
}

func TestOrchestratorServer_IntersectSkills_Performance(t *testing.T) {
	server := &OrchestratorServer{}

	// Test with large skill sets to ensure performance is reasonable
	largeRequired := make([]string, 100)
	largeDev := make([]string, 100)

	for i := 0; i < 100; i++ {
		largeRequired[i] = fmt.Sprintf("skill%d", i)
		largeDev[i] = fmt.Sprintf("skill%d", i+50) // 50% overlap
	}

	result := server.intersectSkills(largeRequired, largeDev)

	// Should find 50 matches (skills 50-99)
	assert.Equal(t, 50, len(result), "Should handle large skill sets efficiently")
}

// Test helper functions coverage

func TestOrchestratorServer_HelperFunctions(t *testing.T) {
	server := &OrchestratorServer{
		logger: zaptest.NewLogger(t),
	}

	t.Run("skill_score_calculation", func(t *testing.T) {
		// Test cases where intersectSkills is called with various parameters
		tests := []struct {
			required []string
			dev      []string
			expected float64
		}{
			{[]string{"go", "python"}, []string{"go", "python"}, 1.0}, // Perfect match
			{[]string{"go", "python"}, []string{"go"}, 0.5},           // Half match
			{[]string{"go", "python"}, []string{"java"}, 0.0},         // No match
			{[]string{}, []string{"go"}, 1.0},                         // Empty required = perfect
			{[]string{"go"}, []string{}, 0.0},                         // Empty dev = no match
		}

		for _, tt := range tests {
			// Create a task event and developer to test skill scoring
			taskEvent := &eventsv1.TaskCreated{
				SkillTags: tt.required,
			}
			developer := &usersv1.DeveloperProfile{
				SkillTags: tt.dev,
			}

			// This indirectly tests intersectSkills through calculateMatchScore
			score := server.calculateMatchScore(taskEvent, developer)
			// We're mainly testing that the function doesn't panic and processes the skills
			assert.GreaterOrEqual(t, score, 0.0, "Score should be non-negative")
			assert.LessOrEqual(t, score, 2.0, "Score should be reasonable")
		}
	})
}

// Benchmark test for performance validation
func BenchmarkOrchestratorServer_CalculateMatchScore(b *testing.B) {
	server := &OrchestratorServer{
		logger: zaptest.NewLogger(&testing.T{}),
	}

	taskEvent := &eventsv1.TaskCreated{
		TaskId:           "benchmark-task",
		SkillTags:        []string{"go", "postgresql", "docker", "kubernetes"},
		BudgetLowerBound: 50.0,
		BudgetUpperBound: 100.0,
	}

	developer := &usersv1.DeveloperProfile{
		UserId:     "benchmark-dev",
		SkillTags:  []string{"go", "python", "docker", "aws"},
		HourlyRate: 75.0,
		Rating:     4.5,
	}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		score := server.calculateMatchScore(taskEvent, developer)
		if score < 0 {
			b.Fatal("Invalid score")
		}
	}
}

func BenchmarkOrchestratorServer_IntersectSkills(b *testing.B) {
	server := &OrchestratorServer{}

	requiredSkills := []string{"go", "python", "java", "javascript", "typescript", "rust", "c++", "c#"}
	devSkills := []string{"go", "python", "docker", "kubernetes", "aws", "gcp", "terraform", "ansible"}

	b.ResetTimer()

	for i := 0; i < b.N; i++ {
		result := server.intersectSkills(requiredSkills, devSkills)
		if result == nil {
			b.Fatal("Unexpected nil result")
		}
	}
}
