organization := "underad"

name := "dashboard"

version := "1.0-SNAPSHOT"

scalaVersion := "2.11.2"

webSettings

libraryDependencies ++= {
  val liftVersion = "2.6-RC1"
  val slf4jVersion = "1.6.4"
  Seq(
    "net.liftweb" %% "lift-webkit" % liftVersion % "compile",
    "net.liftweb" %% "lift-mapper" % liftVersion % "compile->default",
    "org.eclipse.jetty" % "jetty-webapp" % "8.1.7.v20120910"  %
      "container,test",
    "org.eclipse.jetty.orbit" % "javax.servlet" % "3.0.0.v201112011016" %
      "container,compile" artifacts Artifact("javax.servlet", "jar", "jar"),
    "org.postgresql" % "postgresql" % "9.3-1102-jdbc41",
    "log4j" % "log4j" % "1.2.16" % "compile->default",
    "org.slf4j" % "slf4j-api" % slf4jVersion % "compile->default",
    "org.slf4j" % "slf4j-log4j12" % slf4jVersion % "compile->default"
  )
}

port in container.Configuration := 9090