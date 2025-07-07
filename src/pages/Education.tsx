
import Layout from "@/components/Layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BookOpen, Play, Clock, Star, Users } from "lucide-react"

const Education = () => {
  const courses = [
    {
      title: "Trading Fundamentals",
      description: "Master the basics of trading with comprehensive beginner modules",
      duration: "8 hours",
      rating: 4.9,
      students: 1200,
      level: "Beginner",
      image: "/api/placeholder/300/200"
    },
    {
      title: "Technical Analysis Mastery",
      description: "Advanced chart patterns, indicators, and market structure analysis",
      duration: "12 hours",
      rating: 4.8,
      students: 950,
      level: "Advanced",
      image: "/api/placeholder/300/200"
    },
    {
      title: "Risk Management Strategies",
      description: "Learn professional risk management and position sizing techniques",
      duration: "6 hours",
      rating: 4.9,
      students: 800,
      level: "Intermediate",
      image: "/api/placeholder/300/200"
    },
    {
      title: "Psychology of Trading",
      description: "Develop the mindset and emotional control of successful traders",
      duration: "10 hours",
      rating: 4.7,
      students: 1100,
      level: "All Levels",
      image: "/api/placeholder/300/200"
    }
  ]

  return (
    <Layout>
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-primary to-amber-300 bg-clip-text text-transparent">
            Premium Education
          </h1>
          <p className="text-lg text-muted-foreground">
            Master the markets with our comprehensive trading courses designed by professional traders.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {courses.map((course, index) => (
            <Card key={index} className="group hover:scale-[1.02] transition-all duration-300 bg-background/50 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10">
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-amber-300/20 rounded-t-lg flex items-center justify-center">
                <BookOpen className="h-12 w-12 text-primary" />
              </div>
              
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold px-2 py-1 rounded-full bg-primary/20 text-primary">
                    {course.level}
                  </span>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-amber-400 fill-current" />
                    <span className="text-sm font-medium">{course.rating}</span>
                  </div>
                </div>
                
                <CardTitle className="text-lg">{course.title}</CardTitle>
                <CardDescription>{course.description}</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {course.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {course.students}
                  </div>
                </div>
                
                <Button className="w-full bg-gradient-to-r from-primary to-amber-300 hover:from-primary/90 hover:to-amber-300/90 text-background">
                  <Play className="h-4 w-4 mr-2" />
                  Start Course
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Layout>
  )
}

export default Education
