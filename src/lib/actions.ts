import inquirer from 'inquirer'
import { 
  simpleGit,
  SimpleGit,
  CleanOptions,
  SimpleGitProgressEvent,
  CloneOptions,
} from 'simple-git'
import chalk from 'chalk'
import ora from 'ora'
import { getLatestRelease } from './utils.js'

/**
 * action for create command
 * @example fixit create [project-name]
 */
function createAction() {
  const promptList = [
    {
      type: 'input',
      message: 'Please input project name:',
      name: 'name',
      default: '',
      validate: (val: string) => {
        if (val === '') {
          return 'project name is required'
        }
        return true
      }
    },
    {
      type: 'list',
      message: 'Please choose a template:',
      name: 'template',
      choices: [
        {
          name: 'Hugo module',
          value: 'go',
        },
        {
          name: 'Git submodule',
          value: 'git',
        },
      ],
    }
  ]
  const repositories = {
    go: 'https://github.com/hugo-fixit/hugo-fixit-starter.git',
    git: 'https://github.com/hugo-fixit/hugo-fixit-starter1.git',
  }
  const projectName = process.argv[3]
  if (projectName) {
    promptList[0].default = projectName
  }
  inquirer
    .prompt(promptList)
    .then((answers: { name: string, template: 'go' | 'git' }) => {
      console.log(`Initializing FixIt project ${answers.name}, please wait a moment.`)
      // 1. download template
      const spinnerClone = ora(`Downloading template from ${chalk.cyan(repositories[answers.template])}.`).start()
      const progress = ({method, stage, progress}: SimpleGitProgressEvent) => {
        spinnerClone.text = chalk.yellow(`git.${method} ${stage} stage ${progress}% complete${'.'.repeat(Math.floor(Math.random() * 3) + 1)}`)
      }
      // const git: SimpleGit = simpleGit({ progress, recursive: true })
      const git: SimpleGit = simpleGit({ progress })
      git.clean(CleanOptions.FORCE)
      // TODO try to performance submodules download by fixit update command
      const cloneOptions: CloneOptions = {
        '--depth': 1,
        '--branch': 'main',
        '--single-branch': null,
      }
      if (answers.template === 'git') {
        cloneOptions['--recurse-submodules'] = undefined
        cloneOptions['--shallow-submodules'] = undefined
      }
      git.clone(repositories[answers.template], answers.name, cloneOptions, (err) => {
        if (err) {
          spinnerClone.fail()
          console.log(chalk.red(err))
          return
        }
        spinnerClone.text = `${chalk.green('[Success]')} downloaded template from ${chalk.cyan(repositories[answers.template])}.`
        spinnerClone.succeed()

        // 2. initialize FixIt project
        const spinnerInit = ora(`Initializing FixIt project ${answers.name}`).start()
        // remove remote origin
        git.cwd(answers.name)
        spinnerInit.text = 'Removing remote origin.'
        git.removeRemote('origin', (err) => {
          if (err) {
            spinnerInit.fail()
            console.log(chalk.red(err))
            return
          }
          spinnerInit.text = `${chalk.green('[Success]')} removed remote origin.`
        })
        spinnerInit.text = 'Removing history commits.'
        // remove history commits
        git.raw(['update-ref', '-d', 'HEAD'], (err) => {
          if (err) {
            spinnerInit.fail()
            console.log(chalk.red(err))
            return
          }
          spinnerInit.text = `${chalk.green('[Success]')} removed history commits.`
        })
        .then(async () => {
          // commit first commit
          await git.add('./*')
          await git.commit('first commit')
          spinnerInit.text = `${chalk.green('[Success]')} initialized FixIt project ${answers.name}.`
          spinnerInit.succeed()
          console.log('🎉 Congratulations! You have created a new FixIt project.\n')
          console.log(`${chalk.blue(`cd ${answers.name} && hugo server -O`)}\n\nGo! Enjoy it and Fix it! 🐛`)
        })
      })
    })
}

/**
 * action for check command
 * @example fixit check
 * @example GITHUB_TOKEN=ghp_ifbeKixxxxxxxxxxxxxxxxxxxxxxxx0gVAgF fixit check
 */
function checkAction() {
  const spinner = ora('Checking the latest version of FixIt theme.').start()
  getLatestRelease('hugo-fixit', 'FixIt')
    .then(({ version, changelog, homeUrl }) => {
      spinner.text = `${chalk.green('[Success]')} the latest version of FixIt theme is ${chalk.blue(version)}.`
      spinner.succeed()
      console.log(`Release Notes: ${chalk.cyan(homeUrl)}\n\n${chalk.magenta(changelog)}\n`)
      console.log(`${chalk.green('Note:')}\nYou can use commands below to update FixIt theme to the latest version.\n`)
      console.log(`Hugo module:\n  ${chalk.blue(`hugo mod get -u github.com/hugo-fixit/FixIt@${version}\n  hugo mod tidy`)}`)
      console.log(`Git submodule:\n  ${chalk.blue('git submodule update --remote --merge themes/FixIt')}\n`)
    })
    .catch((error) => {
      spinner.text = `${chalk.red('[Failed]')} failed to check the latest version of FixIt theme.`
      spinner.fail()
      console.log(chalk.red(error))
      console.log(`\n${chalk.green('Note:')}\nYou can set GITHUB_TOKEN env to avoid GitHub API rate limit.\nRun command ${chalk.blue('fixit help check')} for more details.\n`)
    })
}

/**
 * action for help command
 * @param {String} command specific command
 * @example fixit help <command>
 */
function helpAction(command: string) {
  switch (command) {
    case 'create':
      console.log('Create a new FixIt project from a template based on Git submodule or Hugo module.')
      console.log(`Usage: ${chalk.blue('fixit create <project-name>')}`)
      break
    case 'check':
      console.log('Check the latest version of FixIt theme.')
      console.log(`Usage: ${chalk.blue('[GITHUB_TOKEN=xxx] fixit check')}`)
      console.log(`\n${chalk.green('Note:')}\nYou can set GITHUB_TOKEN env to avoid GitHub API rate limit.`)
      console.log(`Head to ${chalk.cyan('https://docs.github.com/en/github/authenticating-to-github/keeping-your-account-and-data-secure/creating-a-personal-access-token')}\nfor guidance on how to create a personal access token.\n`)
      break
    case 'help':
      console.log('Display help for a specific command.')
      console.log(`Usage: ${chalk.blue('fixit help <command>')}`)
      break
    default:
      console.log(`Unknown help topic ${chalk.red(command)}.`)
      console.log(`Refer to ${chalk.blue('fixit --help')} for supported commands.`)
  }
}

export {
  createAction,
  checkAction,
  helpAction,
}